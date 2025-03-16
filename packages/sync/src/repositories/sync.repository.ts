import { Injectable, Inject } from '@nestjs/common';
import { Origin } from '@common/constants/sync.constants';
import { MongoDbService, MONGO_URI } from 'src/db/mongo.provider';
import { error } from '@common/errors/error.handler';
import { SyncError } from '@common/errors/sync.errors';
import { getPrimaryGcalId } from 'src/util/gcal.util';
import {
  Payload_Resource_Events,
  Payload_Sync_Events,
  Resource_Sync,
  Schema_Sync,
} from '@common/types/sync.types';
import { Schema_CalendarList } from '@common/types/calendar.types';
import { syncExpiresSoon } from 'src/util/sync.util';
import { syncExpired } from 'src/util/sync.util';

@Injectable()
export class SyncRepository {
  constructor(@Inject(MONGO_URI) private db: MongoDbService) {}

  async createSync(
    userId: string,
    calendarList: Schema_CalendarList,
    nextSyncToken: string,
  ) {
    const gCalendarId = getPrimaryGcalId(calendarList);

    return await this.db.sync.insertOne({
      user: userId,
      google: {
        calendarlist: [
          {
            gCalendarId,
            nextSyncToken,
            lastSyncedAt: new Date(),
          },
        ],
        events: [],
      },
    });
  }

  async deleteAllSyncData(userId: string) {
    await this.db.sync.deleteOne({ user: userId });
  }

  async deleteWatchData(
    userId: string,
    resource: Resource_Sync,
    channelId: string,
  ) {
    return await this.db.sync.updateOne(
      { user: userId, [`google.${resource}.channelId`]: channelId },
      {
        $unset: {
          [`google.${resource}.$.channelId`]: '',
          [`google.${resource}.$.expiration`]: '',
        },
      },
    );
  }

  async deleteSync(userId: string): Promise<void> {
    await this.db.sync.deleteOne({ user: userId });
  }

  async findAllActiveUsers() {
    return this.db.user.find().toArray();
  }

  async findSync(params: {
    userId?: string;
    gCalendarId?: string;
    resourceId?: string;
  }): Promise<Schema_Sync | null> {
    let filter = {};

    if (params.userId) {
      filter = { user: params.userId };
    }

    if (params.gCalendarId) {
      filter = { ...filter, 'google.events.gCalendarId': params.gCalendarId };
    }

    if (params.resourceId) {
      filter = { ...filter, 'google.events.resourceId': params.resourceId };
    }

    if (Object.keys(filter).length === 0) {
      throw new Error('Sync record could not be retrieved');
    }

    return await this.db.sync.findOne(filter);
  }

  async findSyncByToken(syncToken: string): Promise<Schema_Sync | null> {
    const resources = ['calendarlist', 'events'];

    for (const r of resources) {
      const match = await this.db.sync.findOne({
        [`google.${r}.nextSyncToken`]: syncToken,
      });

      if (match) {
        return match;
      }
    }

    return null;
  }

  getSyncsToRefresh = (sync: Schema_Sync) => {
    const syncsToRefresh: Payload_Sync_Events[] = [];

    sync.google.events.map((s) => {
      const expiry = s.expiration;

      if (!syncExpired(expiry) && syncExpiresSoon(expiry)) {
        syncsToRefresh.push(s);
      }
    });

    return syncsToRefresh;
  };

  async hasRecentCompassUpdates(
    userId: string,
    deadline: string,
  ): Promise<boolean> {
    const recentChanges = await this.db.event.countDocuments({
      user: userId,
      origin: Origin.COMPASS,
      updatedAt: { $gt: new Date(deadline) },
    });

    return recentChanges > 0;
  }

  async isWatchingEventsByGcalId(
    userId: string,
    gCalendarId: string,
  ): Promise<boolean> {
    const count = await this.db.sync.countDocuments({
      user: userId,
      'google.events.gCalendarId': gCalendarId,
      'google.events.$.channelId': { $exists: true },
      'google.events.$.expiration': { $exists: true },
    });

    return count === 1;
  }

  async reInitSyncByIntegration(
    integration: 'google',
    userId: string,
    calendarList: Schema_CalendarList,
    calListSyncToken: string,
  ) {
    const gCalendarId = getPrimaryGcalId(calendarList);

    return await this.db.sync.updateOne(
      {
        user: userId,
      },
      {
        $set: {
          [integration]: {
            calendarlist: [
              {
                gCalendarId,
                nextSyncToken: calListSyncToken,
                lastSyncedAt: new Date(),
              },
            ],
            events: [],
          },
        },
      },
    );
  }

  async updateRefreshedAtFor(
    resource: Resource_Sync,
    userId: string,
    gCalendarId: string,
  ) {
    if (resource !== 'events') {
      throw new Error('Update RefreshedAt Failed - Only events supported');
    }

    return await this.db.sync.updateOne(
      { user: userId, 'google.events.gCalendarId': gCalendarId },
      { $set: { 'google.events.$.lastRefreshedAt': new Date() } },
    );
  }

  async updateSyncTimeBy(key: 'gCalendarId', value: string, userId: string) {
    return await this.db.sync.updateOne(
      { user: userId, [`google.events.${key}`]: value },
      { $set: { 'google.events.$.lastSyncedAt': new Date() } },
    );
  }

  async updateSyncExpiration(
    userId: string,
    channelId: string,
    newExpiration: string,
  ) {
    return await this.db.sync.updateOne(
      { user: userId, 'google.events.channelId': channelId },
      {
        $set: {
          'google.events.$.expiration': newExpiration,
          'google.events.$.lastRefreshedAt': new Date(),
        },
      },
    );
  }

  async updateSyncFor(
    resource: Resource_Sync,
    userId: string,
    data: Payload_Resource_Events,
  ) {
    if (resource !== 'events') {
      throw new Error('Sync Update Failed - Only events supported');
    }

    const syncData = {
      gCalendarId: data.gCalendarId,
      resourceId: data.resourceId,
      lastSyncedAt: new Date(),
      channelId: data.channelId,
      expiration: data.expiration,
    };

    const matches = await this.db.sync.countDocuments({
      user: userId,
      'google.events.gCalendarId': data.gCalendarId,
    });
    const syncExists = matches === 1;

    if (syncExists) {
      return await this.db.sync.updateOne(
        { user: userId, 'google.events.gCalendarId': data.gCalendarId },
        { $set: { 'google.events.$': syncData } },
      );
    }

    return await this.db.sync.updateOne(
      { user: userId },
      { $push: { 'google.events': syncData } },
    );
  }

  async updateSyncTokenFor(
    resource: 'calendarlist' | 'events',
    userId: string,
    nextSyncToken: string,
    gCalendarId?: string,
  ) {
    if (resource === 'calendarlist') {
      return await this.db.sync.findOneAndUpdate(
        {
          user: userId,
        },
        {
          $set: {
            'google.calendarlist.0.nextSyncToken': nextSyncToken,
            'google.calendarlist.0.lastSyncedAt': new Date(),
          },
        },
        { returnDocument: 'after', upsert: true },
      );
    } else {
      if (!gCalendarId) {
        throw error(SyncError.NoGCalendarId, 'Update Sync Token Failed');
      }

      return await this.db.sync.findOneAndUpdate(
        { user: userId, 'google.events.gCalendarId': gCalendarId },
        {
          $set: {
            'google.events.$.nextSyncToken': nextSyncToken,
            'google.events.$.lastSyncedAt': new Date(),
          },
        },
        { upsert: true },
      );
    }
  }
}
