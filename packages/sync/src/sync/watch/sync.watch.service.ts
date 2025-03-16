import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { MongoDbService, MONGO_URI } from '../../db/mongo.provider';
import { GaxiosError } from 'gaxios';
import { gCalendar } from '@common/types/gcal';
import {
  Params_WatchEvents,
  Payload_Resource_Events,
} from '@common/types/sync.types';
import { GCalService } from '../../gcal/gcal.service';
import { SyncRepository } from '../../repositories/sync.repository';
@Injectable()
export class SyncWatchService {
  private clientMap: Map<string, gCalendar> = new Map();

  constructor(
    @Inject(MONGO_URI) private db: MongoDbService,
    private gcalService: GCalService,
    private syncRepository: SyncRepository,
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

    const alreadyWatching = await this.syncRepository.isWatchingEventsByGcalId(
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

      await this.syncRepository.deleteWatchData(userId, 'events', channelId);

      return {
        channelId: channelId,
        resourceId: resourceId,
      };
    } catch (e) {
      const error = e as GaxiosError;
      const code = (error.code as unknown as number) || 0;

      if (error.code === '404' || code === 404) {
        await this.syncRepository.deleteWatchData(userId, 'events', channelId);
        console.warn(
          'Channel no longer exists. Corresponding sync record deleted',
        );
        return {};
      }

      throw e;
    }
  }

  async stopWatches(userId: string) {
    const sync = await this.syncRepository.findSync({ userId });

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

  private getChannelExpiration(): string {
    const now = new Date();
    // Google Calendar watch expires after 7 days
    const expiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return expiration.getTime().toString();
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
