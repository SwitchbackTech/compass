import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { MongoDbService } from '../../../db/mongo.provider';

let mongod: MongoMemoryServer;
let db: MongoDbService;
let client: MongoClient;
let uri: string;

export const setupTestDb = async () => {
  if (!mongod) {
    console.debug('Creating new mongod');
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'test',
      },
      binary: {
        version: '6.0.14',
      },
    });
    uri = mongod.getUri();
    client = await MongoClient.connect(uri);
    const baseDb = client.db();
    db = {
      ...baseDb,
      sync: baseDb.collection('sync'),
      event: baseDb.collection('event'),
      user: baseDb.collection('user'),
    } as MongoDbService;
  }
  return { mongod, db };
};

export const teardownTestDb = async () => {
  if (client) {
    console.debug('Closing client');
    await client.close();
  }
  if (mongod) {
    await mongod.stop();
    // @ts-expect-error - Allow undefined while we're not using the db
    mongod = undefined;
    // @ts-expect-error - Allow undefined while we're not using the db
    db = undefined;
  }
};

export const clearTestDb = async () => {
  if (db) {
    await Promise.all([
      db.sync.deleteMany({}),
      db.event.deleteMany({}),
      db.user.deleteMany({}),
    ]);
  }
};
