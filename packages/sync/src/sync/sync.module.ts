import { Module } from '@nestjs/common';
import { MongoModule } from '../db/mongo.module';
import { SyncController } from './sync.controller';
import { SyncImportService } from './import/sync.import.service';
import { SyncWatchService } from './watch/sync.watch.service';
import { SyncMaintenanceService } from './maintain/sync.maintain.service';
import { SyncNotificationService } from './notify/sync.notify.service';
import { GCalService } from '../gcal/gcal.service';
import { GCalAuthService } from '../gcal/gcal.auth.service';

@Module({
  imports: [MongoModule],
  providers: [
    GCalService,
    GCalAuthService,
    SyncImportService,
    SyncWatchService,
    SyncMaintenanceService,
    SyncNotificationService,
  ],
  controllers: [SyncController],
  exports: [GCalService],
})
export class SyncModule {}
