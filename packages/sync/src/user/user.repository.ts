import { Injectable, Inject } from '@nestjs/common';
import { MongoDbService, MONGO_URI } from '../db/mongo.provider';
import { ObjectId } from 'mongodb';
@Injectable()
export class UserRepository {
  constructor(@Inject(MONGO_URI) private db: MongoDbService) {}

  async deleteUserEvents(userId: string) {
    return await this.db.event.deleteMany({ user: userId });
  }

  async deleteUser(userId: string) {
    return await this.db.user.deleteOne({ _id: new ObjectId(userId) });
  }
}
