import { Module } from '@nestjs/common';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [SyncModule],
})
export class AppModule {}
