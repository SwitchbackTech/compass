import { Injectable, Inject } from '@nestjs/common';
import { MongoDbService, MONGO_URI } from '../db/mongo.provider';
import { Payload_Sync_Notif } from '../types/sync.types';

@Injectable()
export class SyncService {
  constructor(
    @Inject(MONGO_URI) private db: MongoDbService,
    // private importService: SyncImportService,
    // private watchService: SyncWatchService,
    // private maintenanceService: SyncMaintenanceService,
    // private notificationService: SyncNotificationService,
  ) {}

  async handleGoogleNotification(payload: Payload_Sync_Notif) {
    // Implementation coming soon
    throw new Error('Not implemented');
  }

  async runMaintenance() {
    // Implementation coming soon
    throw new Error('Not implemented');
  }
}
