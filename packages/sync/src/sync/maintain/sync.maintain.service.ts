import dayjs from 'dayjs';
import { Injectable } from '@nestjs/common';
import { SyncRepository } from 'src/repositories/sync.repository';
import { Payload_Sync_Refresh, Schema_Sync } from '@common/types/sync.types';
import { hasAnyActiveEventSync } from 'src/util/sync.util';
import { GCalService } from '../../gcal/gcal.service';
import { isInvalidGoogleToken, isFullSyncRequired } from '../../util/gcal.util';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';

interface PruneResult {
  user: string;
  results: { channelId: string; resourceId: string }[];
  sessionsRevoked: number;
  deletedUserData: boolean;
}

interface RefreshResult {
  user: string;
  results: { gcalendarId: string; success: boolean }[];
  resynced: boolean;
  revokedSession: boolean;
}

@Injectable()
export class SyncMaintenanceService {
  constructor(
    private syncRepository: SyncRepository,
    private gcalService: GCalService,
    private authService: AuthService,
    private userService: UserService,
  ) {}

  private getActiveDeadline(): string {
    return dayjs().subtract(14, 'days').format();
  }

  private getChannelExpiration(): string {
    const now = new Date();
    // Google Calendar watch expires after 7 days
    const expiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return expiration.getTime().toString();
  }

  private async getSync(params: {
    userId?: string;
  }): Promise<Schema_Sync | null> {
    return await this.syncRepository.findSync(params);
  }

  private async pruneSync(toPrune: string[]): Promise<PruneResult[]> {
    const _prunes = toPrune.map(async (userId) => {
      let deletedUserData = false;
      const stopped: { channelId: string; resourceId: string }[] = [];

      try {
        // Stop all watches for this user
        const sync = await this.syncRepository.findSync({ userId });
        if (sync?.google.events) {
          for (const es of sync.google.events) {
            if (!es.channelId || !es.resourceId) continue;

            const gcal = await this.gcalService.getClient(userId);
            const stopResult = await this.gcalService.stopChannel(
              gcal,
              es.channelId,
              es.resourceId,
            );

            if (stopResult.status === 204) {
              await this.syncRepository.deleteWatchData(
                userId,
                'events',
                es.channelId,
              );
              stopped.push({
                channelId: es.channelId,
                resourceId: es.resourceId,
              });
            }
          }
        }
      } catch (e) {
        if (isInvalidGoogleToken(e)) {
          await this.userService.deleteCompassDataForUser(userId, false);
          deletedUserData = true;
        } else {
          console.warn('Unexpected error during prune:', e);
          throw e;
        }
      }

      const { sessionsRevoked } =
        await this.authService.revokeSessionsByUser(userId);

      return {
        user: userId,
        results: stopped,
        sessionsRevoked,
        deletedUserData,
      };
    });

    return await Promise.all(_prunes);
  }

  async runMaintenance() {
    const toRefresh: Payload_Sync_Refresh[] = [];
    const toPrune: string[] = [];
    const ignored: string[] = [];

    const deadline = this.getActiveDeadline();
    const users = await this.syncRepository.findAllActiveUsers();

    for (const user of users) {
      const userId = user._id.toString();
      const sync = await this.syncRepository.findSync({ userId });

      if (!sync) {
        ignored.push(userId);
        continue;
      }

      const isUserActive = await this.syncRepository.hasRecentCompassUpdates(
        userId,
        deadline,
      );

      if (isUserActive) {
        const syncsToRefresh = this.syncRepository.getSyncsToRefresh(sync);

        if (syncsToRefresh.length > 0) {
          toRefresh.push({ userId, payloads: syncsToRefresh });
        } else {
          ignored.push(userId);
        }
      } else {
        if (hasAnyActiveEventSync(sync)) {
          toPrune.push(sync.user);
        } else {
          ignored.push(userId);
        }
      }
    }

    // Process the maintenance actions
    const pruneResult = await this.pruneSync(toPrune);
    const refreshResult = await this.refreshSync(toRefresh);

    return {
      ignored: ignored.length,
      pruned: pruneResult.filter((p) => !p.deletedUserData).length,
      refreshed: refreshResult.filter((r) => !r.revokedSession).length,
      revoked: refreshResult.filter((r) => r.revokedSession).length,
      deleted: pruneResult.filter((p) => p.deletedUserData).length,
    };
  }

  async runMaintenanceByUser(userId: string, params: { dry: boolean }) {
    const sync = await this.getSync({ userId });
    if (!sync) {
      return { action: 'ignore', reason: 'no sync' };
    }

    const deadline = this.getActiveDeadline();
    const isUserActive = await this.syncRepository.hasRecentCompassUpdates(
      userId,
      deadline,
    );

    if (isUserActive) {
      const syncsToRefresh = this.syncRepository.getSyncsToRefresh(sync);

      if (syncsToRefresh.length > 0) {
        const result = {
          action: 'refresh',
          reason: 'Active user + expiring soon',
          payload: syncsToRefresh,
        };

        if (params.dry) {
          return result;
        }

        const refreshResult = await this.refreshSync([
          { userId, payloads: syncsToRefresh },
        ]);
        return { ...result, result: refreshResult };
      }

      return {
        action: 'ignore',
        reason: 'Active user + not expired/expiring soon',
      };
    }

    const result = hasAnyActiveEventSync(sync)
      ? { action: 'prune', reason: 'Inactive user + active sync' }
      : { action: 'ignore', reason: 'Inactive user + no active syncs' };

    if (params.dry) {
      return result;
    }

    if (result.action === 'prune') {
      const pruneResult = await this.pruneSync([userId]);
      return { ...result, result: pruneResult };
    }

    return result;
  }

  private async refreshSync(
    toRefresh: Payload_Sync_Refresh[],
  ): Promise<RefreshResult[]> {
    const _refreshes = toRefresh.map(async (r) => {
      let revokedSession = false;
      let resynced = false;

      try {
        const gcal = await this.gcalService.getClient(r.userId);

        const refreshesByUser = r.payloads.map(async (syncPayload) => {
          const stopResult = await this.gcalService.stopChannel(
            gcal,
            syncPayload.channelId,
            syncPayload.resourceId,
          );

          if (stopResult.status !== 204) {
            throw new Error('Stop failed');
          }

          await this.syncRepository.deleteWatchData(
            r.userId,
            'events',
            syncPayload.channelId,
          );

          const watchResult = await this.gcalService.watchEvents(gcal, {
            gCalendarId: syncPayload.gCalendarId,
            channelId: syncPayload.channelId,
            expiration: this.getChannelExpiration(),
          });

          if (!watchResult.watch.resourceId) {
            throw new Error('Calendar watch failed - no resource ID');
          }

          await this.syncRepository.updateSyncFor('events', r.userId, {
            gCalendarId: syncPayload.gCalendarId,
            channelId: syncPayload.channelId,
            resourceId: watchResult.watch.resourceId,
            expiration: this.getChannelExpiration(),
          });

          await this.syncRepository.updateRefreshedAtFor(
            'events',
            r.userId,
            syncPayload.gCalendarId,
          );

          return {
            gcalendarId: syncPayload.gCalendarId,
            success: true,
          };
        });

        const refreshes = await Promise.all(refreshesByUser);
        return { user: r.userId, results: refreshes, resynced, revokedSession };
      } catch (e) {
        if (isInvalidGoogleToken(e)) {
          await this.authService.revokeSessionsByUser(r.userId);
          revokedSession = true;
        } else if (isFullSyncRequired(e)) {
          await this.userService.reSyncGoogleData(r.userId);
          resynced = true;
        } else {
          console.error(
            `Unexpected error during refresh for user: ${r.userId}:\n`,
            e,
          );
          throw e;
        }
        return { user: r.userId, results: [], resynced, revokedSession };
      }
    });

    return await Promise.all(_refreshes);
  }
}
