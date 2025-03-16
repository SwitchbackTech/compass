import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { MongoDbService, MONGO_URI } from '../../db/mongo.provider';
import { GaxiosError } from 'gaxios';
import { gCalendar } from 'src/types/gcal';
import {
  Params_WatchEvents,
  Payload_Resource_Events,
  Schema_Sync,
} from '../../types/sync.types';
import { GCalService } from '../../gcal/gcal.service';

@Injectable()
export class SyncWatchService {
  private clientMap: Map<string, gCalendar> = new Map();

  constructor(
    @Inject(MONGO_URI) private db: MongoDbService,
    private gcalService: GCalService,
  ) {}

  private async getClientForUser(userId: string): Promise<gCalendar> {
    let client = this.clientMap.get(userId);
    if (!client) {
      client = await this.gcalService.getClient(userId);
      this.clientMap.set(userId, client);
    }
    return client;
  }

  async startWatchingGcalEvents(
    userId: string,
    params: { gCalendarId: string },
  ) {
    const gcal = await this.getClientForUser(userId);

    const alreadyWatching = await this.isWatchingEventsByGcalId(
      userId,
      params.gCalendarId,
    );

    if (alreadyWatching) {
      throw new Error('Calendar watch already exists');
    }

    const channelId = uuidv4();
    const expiration = this.getChannelExpiration();

    const watchParams: Params_WatchEvents = {
      gCalendarId: params.gCalendarId,
      channelId: channelId,
      expiration,
    };

    const { watch } = await this.gcalService.watchEvents(gcal, watchParams);
    const { resourceId } = watch;
    if (!resourceId) {
      throw new Error('Calendar watch failed - no resource ID');
    }

    const sync = await this.updateSyncFor(userId, {
      gCalendarId: params.gCalendarId,
      channelId,
      resourceId,
      expiration,
    });

    return sync;
  }

  async stopWatch(userId: string, channelId: string, resourceId: string) {
    const gcal = await this.getClientForUser(userId);

    try {
      const stopResult = await this.gcalService.stopChannel(
        gcal,
        channelId,
        resourceId,
      );
      if (stopResult.status !== 204) {
        throw new Error('Stop failed');
      }

      await this.deleteWatchData(userId, 'events', channelId);

      return {
        channelId: channelId,
        resourceId: resourceId,
      };
    } catch (e) {
      const error = e as GaxiosError;
      const code = (error.code as unknown as number) || 0;

      if (error.code === '404' || code === 404) {
        await this.deleteWatchData(userId, 'events', channelId);
        console.warn(
          'Channel no longer exists. Corresponding sync record deleted',
        );
        return {};
      }

      throw e;
    }
  }

  async stopWatches(userId: string) {
    const sync = await this.getSync({ userId });

    if (!sync || !sync.google.events) {
      return [];
    }

    console.debug(`Stopping all gcal event watches for user: ${userId}`);

    const stopped: { channelId: string; resourceId: string }[] = [];
    for (const es of sync.google.events) {
      if (!es.channelId || !es.resourceId) {
        console.debug(
          `Skipped stop for calendarId: ${es.gCalendarId} due to missing field(s):
            channelId: ${es.channelId}
            resourceid: ${es.resourceId}`,
        );
        continue;
      }

      await this.stopWatch(userId, es.channelId, es.resourceId);

      stopped.push({
        channelId: es.channelId,
        resourceId: es.resourceId,
      });
    }

    return stopped;
  }

  private async isWatchingEventsByGcalId(
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

  private async deleteWatchData(
    userId: string,
    resource: 'events',
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

  private getChannelExpiration(): string {
    const now = new Date();
    // Google Calendar watch expires after 7 days
    const expiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return expiration.getTime().toString();
  }

  private async getSync(params: {
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

  private async updateSyncFor(userId: string, data: Payload_Resource_Events) {
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
}
