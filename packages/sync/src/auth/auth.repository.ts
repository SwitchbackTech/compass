import { Injectable, Inject } from '@nestjs/common';
import { MongoDbService, MONGO_URI } from '../db/mongo.provider';
import { Filter } from 'mongodb';

type Ids_User = 'email' | '_id' | 'google.googleId';

@Injectable()
export class AuthRepository {
  constructor(@Inject(MONGO_URI) private db: MongoDbService) {}

  private getIdFilter(key: Ids_User, value: string): Filter<any> {
    return key === '_id' ? { [key]: value } : { [key]: value };
  }

  async findUserBy(key: Ids_User, value: string) {
    const filter = this.getIdFilter(key, value);
    return await this.db.user.findOne(filter);
  }

  async findUsersBy(key: Ids_User, value: string) {
    const filter = this.getIdFilter(key, value);
    return await this.db.user.find(filter).toArray();
  }

  async updateGoogleRefreshToken(userId: string, gRefreshToken: string) {
    const filter = this.getIdFilter('_id', userId);
    return await this.db.user.findOneAndUpdate(filter, {
      $set: { 'google.gRefreshToken': gRefreshToken },
    });
  }
}
