import { Injectable, Inject } from '@nestjs/common';
import { MongoDbService, MONGO_URI } from '../../db/mongo.provider';
import { gCalendar } from '../../types/gcal.d';

@Injectable()
export class SyncImportService {
  constructor(@Inject(MONGO_URI) private db: MongoDbService) {}

  async importEventsByCalendar(
    userId: string,
    gCalendarId: string,
    initialSyncToken: string,
  ) {
    // TODO: Implement import logic from existing code
    throw new Error('Not implemented');
  }

  async importAllEvents(userId: string, gcal: gCalendar, calendarId: string) {
    // TODO: Implement full import logic
    throw new Error('Not implemented');
  }
}
