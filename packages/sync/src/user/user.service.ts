import { Injectable } from '@nestjs/common';
import { GCalService } from '../gcal/gcal.service';
import { SyncRepository } from '../repositories/sync.repository';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private gcalService: GCalService,
    private syncRepository: SyncRepository,
  ) {}

  async reSyncGoogleData(userId: string): Promise<{ resynced: boolean }> {
    try {
      // Get fresh Google Calendar client
      const gcal = await this.gcalService.getClient(userId);

      // Clear existing sync data
      await this.syncRepository.deleteSync(userId);

      // Re-fetch and store calendar list
      const calendars = await this.gcalService.getCalendarlist(gcal);

      // Store new sync tokens
      if (calendars.nextSyncToken) {
        await this.syncRepository.updateSyncTokenFor(
          'calendarlist',
          userId,
          calendars.nextSyncToken,
        );
      }

      return { resynced: true };
    } catch (error) {
      console.error(`Failed to resync Google data for user ${userId}:`, error);
      return { resynced: false };
    }
  }

  async deleteCompassDataForUser(
    userId: string,
    keepUserRecord = false,
  ): Promise<{ deleted: boolean }> {
    try {
      await Promise.all([
        this.syncRepository.deleteSync(userId),
        this.userRepository.deleteUserEvents(userId),
        ...(keepUserRecord ? [] : [this.userRepository.deleteUser(userId)]),
      ]);

      return { deleted: true };
    } catch (error) {
      console.error(`Failed to delete data for user ${userId}:`, error);
      return { deleted: false };
    }
  }
}
