import { Module } from '@nestjs/common';
import { MongoModule } from '../db/mongo.module';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [MongoModule],
  providers: [
    SyncService,
    // SyncImportService,
    // SyncWatchService,
    // SyncMaintenanceService,
    // SyncNotificationService,
  ],
  controllers: [SyncController],
})
export class SyncModule {}
