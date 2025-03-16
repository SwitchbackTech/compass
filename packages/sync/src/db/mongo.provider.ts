import { MongoClient, Db, Collection } from 'mongodb';
import { Schema_Sync } from '@common/types/sync.types';
import { Schema_Event } from '@core/types/event.types';
import { Schema_User } from '@core/types/user.types';

const IS_DEV = process.env.NODE_ENV === 'development';

export const Collections = {
  CALENDARLIST: IS_DEV ? '_dev.calendarlist' : 'calendarlist',
  EVENT: IS_DEV ? '_dev.event' : 'event',
  OAUTH: IS_DEV ? '_dev.oauth' : 'oauth',
  PRIORITY: IS_DEV ? '_dev.priority' : 'priority',
  SYNC: IS_DEV ? '_dev.sync' : 'sync',
  USER: IS_DEV ? '_dev.user' : 'user',
};

export interface MongoDbService extends Db {
  sync: Collection<Schema_Sync>;
  event: Collection<Schema_Event>;
  user: Collection<Schema_User>;
}

export const MONGO_URI = process.env['MONGO_URI'] as string;
if (!MONGO_URI) {
  throw new Error('MONGO_URI is not set');
}

export const MongoProvider = {
  provide: MONGO_URI,
  useFactory: async (): Promise<MongoDbService> => {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db() as MongoDbService;
    Object.assign(db, {
      sync: db.collection(Collections.SYNC),
      event: db.collection(Collections.EVENT),
      user: db.collection(Collections.USER),
    });

    return db;
  },
};
