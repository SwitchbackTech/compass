// import { Origin } from "@core/constants/core.constants";
// import { MapEvent } from "@core/mappers/map.event";
// import { mockGcalEvent } from "@backend/__tests__/factories/gcal.event.factory";
// import { mockGcal } from "@backend/__tests__/factories/gcal.factory";
// import {
//   cleanupTestMongo,
//   clearCollections,
//   setupTestMongo,
// } from "@backend/__tests__/helpers/mock.db.setup";
// import gcalService from "@backend/common/services/gcal/gcal.service";
// import mongoService from "@backend/common/services/mongo.service";
// import {
//   ACTIONS_SYNC,
//   SyncNotificationService,
//   WS_RESULT,
// } from "./sync.notify";

// // Create a deterministic event factory for this specific test
// const createRecurringEvent = () => {
//   const TEST_EVENT_ID = "test-recurring-event";
//   const TEST_INSTANCE_IDS = ["instance-1", "instance-2", "instance-3"];

//   const baseDate = new Date("2024-03-20T10:00:00Z");
//   const baseEvent = mockGcalEvent({
//     id: TEST_EVENT_ID,
//     summary: "Test Recurring Event",
//     start: { dateTime: baseDate.toISOString() },
//     end: { dateTime: new Date(baseDate.getTime() + 3600000).toISOString() },
//     recurrence: ["RRULE:FREQ=WEEKLY"],
//   });

//   const instances = TEST_INSTANCE_IDS.map((id, index) => ({
//     ...baseEvent,
//     id,
//     recurringEventId: TEST_EVENT_ID,
//     start: {
//       dateTime: new Date(
//         baseDate.getTime() + index * 7 * 24 * 60 * 60 * 1000,
//       ).toISOString(),
//       timeZone: "UTC",
//     },
//     end: {
//       dateTime: new Date(
//         baseDate.getTime() + index * 7 * 24 * 60 * 60 * 1000 + 3600000,
//       ).toISOString(),
//       timeZone: "UTC",
//     },
//   }));

//   return { baseEvent, instances, TEST_EVENT_ID, TEST_INSTANCE_IDS };
// };

// // Mock Google Calendar API responses
// jest.mock("googleapis", () => {
//   const { baseEvent, instances } = createRecurringEvent();
//   return mockGcal({
//     events: [baseEvent, ...instances],
//     nextSyncToken: "test-sync-token",
//   });
// });

// const setupTestDatabase = async (userId: string) => {
//   const { baseEvent, instances } = createRecurringEvent();

//   // Map to Compass events
//   const compassEvents = [
//     ...MapEvent.toCompass(userId, [baseEvent], Origin.GOOGLE_IMPORT),
//     ...MapEvent.toCompass(userId, instances, Origin.GOOGLE_IMPORT),
//   ].filter((event): event is NonNullable<typeof event> => event !== undefined);

//   // Insert into database
//   await mongoService.event.insertMany(compassEvents);

//   return {
//     baseEvent,
//     instances,
//     compassEvents,
//   };
// };

// describe("Recurring Event Updates", () => {
//   let syncNotifyService: SyncNotificationService;
//   let setup: Awaited<ReturnType<typeof setupTestMongo>>;
//   let testData: Awaited<ReturnType<typeof setupTestDatabase>>;

//   beforeAll(async () => {
//     setup = await setupTestMongo();
//     syncNotifyService = new SyncNotificationService();
//     testData = await setupTestDatabase(setup.userId);
//   });

//   beforeEach(async () => {
//     await clearCollections(setup.db);
//     // Re-setup the database for each test
//     testData = await setupTestDatabase(setup.userId);
//   });

//   afterAll(async () => {
//     await cleanupTestMongo(setup);
//   });

it.todo("should update only the modified instance");
//   it("should update only the modified instance", async () => {
//     // Create a modified version of one instance
//     const modifiedInstance = {
//       ...testData.instances[1],
//       summary: "Modified Instance",
//     };

//     // Mock the Google Calendar API to return the modified instance
//     jest.spyOn(gcalService, "getEvents").mockResolvedValueOnce({
//       config: {},
//       data: {
//         items: [modifiedInstance],
//         nextSyncToken: "new-sync-token",
//       },
//       status: 200,
//       statusText: "OK",
//       headers: {},
//       request: {
//         responseURL:
//           "https://www.googleapis.com/calendar/v3/calendars/primary/events",
//       },
//     });

//     // Trigger notification
//     const result = await syncNotifyService.handleGcalNotification({
//       channelId: "test-channel-id",
//       resourceId: "test-resource-id",
//       resourceState: "exists",
//       expiration: new Date(Date.now() + 3600000).toISOString(),
//     });

//     // Verify notification processing
//     expect(result.action).toBe(ACTIONS_SYNC.PROCESSED);
//     expect(result.updated).toBe(1);
//     expect(result.created).toBe(0);
//     expect(result.wsResult).not.toBe(WS_RESULT.UNPROCESSED);

//     // Assertions
//     const updatedEvents = await mongoService.event.find().toArray();

//     // Check that only the modified instance was updated
//     const modifiedEvent = updatedEvents.find(
//       (e) => e.gEventId === modifiedInstance.id,
//     );
//     expect(modifiedEvent?.title).toBe("Modified Instance");

//     // Check that other instances remain unchanged
//     const unchangedEvents = updatedEvents.filter(
//       (e) => e.gEventId !== modifiedInstance.id,
//     );
//     expect(unchangedEvents).toHaveLength(testData.instances.length - 1);
//     unchangedEvents.forEach((event) => {
//       expect(event.title).toBe(testData.baseEvent.summary);
//     });
//   });
// });
