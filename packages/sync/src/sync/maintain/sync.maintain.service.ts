import { Injectable, Inject } from '@nestjs/common';
import { MongoDbService, MONGO_URI } from '../../db/mongo.provider';

@Injectable()
export class SyncMaintenanceService {
  constructor(@Inject(MONGO_URI) private db: MongoDbService) {}

  async runMaintenance() {
    // TODO: Implement maintenance logic
    throw new Error('Not implemented');
  }

  async runMaintenanceByUser(userId: string, params: { dry: boolean }) {
    // TODO: Implement per-user maintenance
    throw new Error('Not implemented');
  }
}
