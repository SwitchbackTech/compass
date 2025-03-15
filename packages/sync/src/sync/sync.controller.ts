import { Controller, Post, Body } from '@nestjs/common';
import { SyncService } from './sync.service';
import { Payload_Sync_Notif } from '../types/sync.types';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('notification')
  async handleNotification(@Body() payload: Payload_Sync_Notif) {
    return this.syncService.handleGoogleNotification(payload);
  }

  @Post('maintain')
  async maintain() {
    return this.syncService.runMaintenance();
  }
}
