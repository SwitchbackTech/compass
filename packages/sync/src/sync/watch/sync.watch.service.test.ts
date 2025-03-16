import { Test, TestingModule } from '@nestjs/testing';
import { SyncWatchService } from './sync.watch.service';
import { MONGO_URI, MongoDbService } from '../../db/mongo.provider';
import { GCalService } from '../../gcal/gcal.service';
import { GCalAuthService } from '../../gcal/gcal.auth.service';
import { setupTestDb, clearTestDb, teardownTestDb } from '../test/db/memory.db';

describe('SyncWatchService Integration', () => {
  let module: TestingModule;
  let service: SyncWatchService;
  let db: MongoDbService;

  beforeAll(async () => {
    const { db: testDb } = await setupTestDb();
    db = testDb;

    module = await Test.createTestingModule({
      providers: [
        SyncWatchService,
        GCalAuthService,
        GCalService,
        {
          provide: MONGO_URI,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<SyncWatchService>(SyncWatchService);
  });

  afterAll(async () => {
    await module.close();
    await teardownTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  it('should create a watch and store it in the database', async () => {
    // Setup test data
    const userId = 'test-user';
    const calendarId = 'primary';

    await db.sync.insertOne({
      user: userId,
      google: {
        calendarlist: [],
        events: [],
      },
    });

    // Execute watch creation
    await service.startWatchingGcalEvents(userId, { gCalendarId: calendarId });

    // Verify database state
    const syncRecord = await db.sync.findOne({ user: userId });
    expect(syncRecord?.google.events).toHaveLength(1);
    expect(syncRecord?.google.events[0]).toMatchObject({
      gCalendarId: calendarId,
      resourceId: 'test-resource-id',
      channelId: expect.any(String) as string,
    });
  });
});
