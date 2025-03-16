import { Module } from '@nestjs/common';
import { SyncModule } from './sync/sync.module';
import { AuthService } from './auth/auth.service';
import { AuthRepository } from './auth/auth.repository';

@Module({
  imports: [SyncModule],
  providers: [AuthService, AuthRepository],
  exports: [AuthService, AuthRepository],
})
export class AppModule {}
