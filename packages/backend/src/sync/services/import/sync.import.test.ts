import {
  cleanupTestMongo,
  clearCollections,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import mongoService from "@backend/common/services/mongo.service";
import { createSyncImport } from "./sync.import";

// Mock Google Calendar API responses
jest.mock("googleapis", () => {
  const { gcalEvents } = mockGcalEvents();
  const googleapis = mockGcal({ events: gcalEvents });
  return googleapis;
});
const totals = mockGcalEvents().totals;

describe("SyncImport", () => {
  let syncImport: Awaited<ReturnType<typeof createSyncImport>>;
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
    syncImport = await createSyncImport(setup.userId);
  });

  beforeEach(async () => {
    await clearCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  describe("Full import", () => {
    it("should include regular and recurring events and skip cancelled events", async () => {
      const { total: totalProcessed, nextSyncToken } =
        await syncImport.importAllEvents(setup.userId, "test-calendar");

      const currentEventsInDb = await mongoService.event.find().toArray();

      // Ensure all available gcal events were processed
      expect(totalProcessed).toEqual(totals.total);

      // Ensure cancelled events were not imported
      expect(currentEventsInDb).toHaveLength(totals.total - totals.cancelled);

      // Ensures recurring events were imported
      const recurringEvents = currentEventsInDb.filter(
        (e) => e.recurrence !== undefined,
      );
      expect(recurringEvents).toHaveLength(totals.recurring);

      // Incremental imports need this token, so make sure it's present
      expect(nextSyncToken).toBe("final-sync-token");
    });
  });
});
