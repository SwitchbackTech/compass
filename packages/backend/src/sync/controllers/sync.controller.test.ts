import { ObjectId, WithId } from "mongodb";
import { randomUUID } from "node:crypto";
import { DefaultEventsMap } from "socket.io";
import { Socket } from "socket.io-client";
import { faker } from "@faker-js/faker";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { Status } from "@core/errors/status.codes";
import { EventStatus } from "@core/types/event.types";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { Schema_User } from "@core/types/user.types";
import { isBase, isInstance } from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { SyncControllerDriver } from "@backend/__tests__/drivers/sync.controller.driver";
import {
  getCategorizedEventsInDb,
  getEventsInDb,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import { waitUntilEvent } from "@backend/common/helpers/common.util";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import * as syncQueries from "@backend/sync/util/sync.queries";
import { updateSync } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";
import dayjs from "../../../../core/src/util/date/dayjs";

describe("SyncController", () => {
  const baseDriver = new BaseDriver();
  const syncDriver = new SyncControllerDriver(baseDriver);

  async function websocketUserFlow(waitForEventChanged = false): Promise<{
    user: WithId<Schema_User>;
    websocketClient: Socket<DefaultEventsMap, DefaultEventsMap>;
  }> {
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);

    const websocketClient = baseDriver.createWebsocketClient(
      { userId: user._id.toString(), sessionId: randomUUID() },
      { autoConnect: false },
    );

    await waitUntilEvent(websocketClient, "connect", 100, () =>
      Promise.resolve(websocketClient.connect()),
    );

    const [importEnd, eventChanged] = await Promise.allSettled([
      syncDriver.waitUntilImportGCalEnd(
        websocketClient,
        () => syncDriver.importGCal({ userId: user._id.toString() }),
        (reason) => Promise.resolve(reason),
      ),
      ...(waitForEventChanged
        ? [baseDriver.waitUntilWebsocketEvent(websocketClient, EVENT_CHANGED)]
        : []),
    ]);

    expect(importEnd.status).toEqual("fulfilled");
    expect((importEnd as { value: unknown })?.value).toBeNull();

    if (waitForEventChanged) expect(eventChanged?.status).toEqual("fulfilled");

    return { user, websocketClient };
  }

  beforeAll(async () => {
    await setupTestDb();

    baseDriver.initWebsocketServer();

    await baseDriver.listen();
  });

  beforeEach(cleanupCollections);

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  describe("handleGoogleNotification", () => {
    it("should throw error when no watch record found", async () => {
      const response = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: faker.string.uuid(),
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future(),
        },
        Status.BAD_REQUEST,
      );

      expect(response.text).toContain(
        WatchError.NoWatchRecordForUser.description,
      );
    });

    it("should ignore notification when watch channel is initialized", async () => {
      const response = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: faker.string.uuid(),
          resourceState: XGoogleResourceState.SYNC,
          expiration: faker.date.future(),
        },
        Status.OK,
      );

      expect(response.text).toEqual("INITIALIZED");
    });

    it("should ignore notification when no sync token found", async () => {
      // Setup
      const newUser = await AuthDriver.googleSignup();
      const user = await AuthDriver.googleLogin(newUser._id);
      const userId = user._id.toString();

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: { $ne: Resource_Sync.CALENDAR },
      });

      expect(watch).toBeDefined();
      expect(watch).not.toBeNull();

      const calendarId = watch!.gCalendarId;
      const resource = Resource_Sync.EVENTS;
      const channelId = watch!._id;
      const resourceId = watch!.resourceId;
      const expiration = watch!.expiration;

      const syncUpdate = await updateSync(
        Resource_Sync.EVENTS,
        userId,
        calendarId,
        { nextSyncToken: undefined },
      );

      expect(syncUpdate.modifiedCount).toEqual(1);

      const response = await syncDriver.handleGoogleNotification(
        {
          resource,
          channelId,
          resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration,
        },
        Status.NO_CONTENT,
      );

      expect(response.text).toEqual("");
    });

    it("should cleanup stale gcal watches for expired channels if resourceId exists", async () => {
      const newUser = await AuthDriver.googleSignup();
      const user = await AuthDriver.googleLogin(newUser._id);
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const userId = user._id.toString();
      const calendarId = calendar.metadata.id;
      const resource = Resource_Sync.EVENTS;

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: calendarId,
      });

      expect(watch).toBeDefined();
      expect(watch).not.toBeNull();

      const response = await syncDriver.handleGoogleNotification(
        {
          resource,
          channelId: zObjectId.parse(watch?._id),
          resourceId: StringV4Schema.parse(watch?.resourceId),
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future({ refDate: watch?.expiration }),
        },
        Status.OK,
      );

      expect(response.text).toEqual("IGNORED");
    });
  });

  describe("importGCal: ", () => {
    describe("Imported Data: ", () => {
      it("should import the first instance of a recurring event (and the base)", async () => {
        // Importing both the base and first instance helps us find the series recurrence rule.
        // To prevent duplicates in the UI, the GET API will not return the base event
        const { user } = await websocketUserFlow(true);
        const calendars = await calendarService.getAllByUser(user._id);

        const currentEventsInDb = await getEventsInDb({
          calendar: { $in: calendars.map((c) => c._id) },
          isSomeday: false,
        });

        const baseEvent = currentEventsInDb.find(isBase)!;
        const firstInstance = currentEventsInDb
          .filter(isInstance)
          .find((instance) =>
            dayjs(instance.startDate).isSame(baseEvent.startDate),
          );

        expect(baseEvent).toBeDefined();
        expect(baseEvent).not.toBeNull();
        expect(firstInstance).toBeDefined();
        expect(firstInstance).not.toBeNull();

        expect(baseEvent.startDate).toEqual(firstInstance?.startDate);
      });

      it("should connect instances to their base events", async () => {
        const { user } = await websocketUserFlow(true);
        const calendars = await calendarService.getAllByUser(user._id);

        const { baseEvents, instances } = await getCategorizedEventsInDb({
          calendar: { $in: calendars.map((c) => c._id) },
          isSomeday: false,
        });

        instances.forEach((instance) => {
          const base = baseEvents.find((e) =>
            e._id.equals(instance.recurrence?.eventId),
          );

          expect(base).toBeDefined();
          expect(base).not.toBeNull();
        });
      });

      it("should include regular and recurring events and skip cancelled events", async () => {
        const { user } = await websocketUserFlow(true);
        const calendars = await calendarService.getAllByUser(user._id);
        const gcal = await getGcalClient(user._id);

        const currentEventsInDb = await getEventsInDb({
          calendar: { $in: calendars.map((c) => c._id) },
          isSomeday: false,
        });

        const gcalEvents = await Promise.all(
          currentEventsInDb.map(async ({ metadata, calendar }) => {
            const cal = calendars.find((c) => c._id.equals(calendar));
            const event = await gcalService.getEvent(
              gcal,
              StringV4Schema.parse(metadata?.id),
              StringV4Schema.parse(cal?.metadata.id),
            );

            return event;
          }),
        );

        expect(gcalEvents).toHaveLength(currentEventsInDb.length);

        gcalEvents.forEach((gcalEvent) => {
          expect(gcalEvent.status).not.toBe(EventStatus.CANCELLED);
        });

        // Verify we have base events
        const baseEvents = currentEventsInDb.filter(isBase);

        expect(baseEvents.length).toBeGreaterThan(calendars.length);

        // Verify we have the correct instance
        const instanceEvents = currentEventsInDb.filter(isInstance);

        instanceEvents.every((e) => {
          const base = baseEvents.find((base) =>
            base._id.equals(zObjectId.parse(e.recurrence?.eventId)),
          );

          expect(base).toBeDefined();
          expect(base).not.toBeNull();
        });

        // Verify we have the regular event
        const regularEvents = currentEventsInDb.filter(
          ({ recurrence }) => recurrence === undefined || recurrence === null,
        );

        expect(regularEvents.length).toBeGreaterThan(calendars.length);
      });

      it("should not create duplicate events for recurring events", async () => {
        const { user } = await websocketUserFlow(true);
        const calendars = await calendarService.getAllByUser(user._id);

        const currentEventsInDb = await getEventsInDb({
          calendar: { $in: calendars.map((c) => c._id) },
          isSomeday: false,
        });

        // Get all instance events
        const instances = currentEventsInDb.filter(isInstance);

        // For each instance event, verify there are no duplicates
        const eventIds = new Set<string>();
        const duplicateEvents = instances.filter((event) => {
          if (!event.metadata?.id) return false; // Skip events without IDs
          if (eventIds.has(event.metadata.id)) return true;
          eventIds.add(event.metadata.id);
          return false;
        });

        expect(duplicateEvents).toHaveLength(0);
      });

      it("should not create duplicate events for regular events", async () => {
        const { user } = await websocketUserFlow(true);
        const calendars = await calendarService.getAllByUser(user._id);

        const currentEventsInDb = await getEventsInDb({
          calendar: { $in: calendars.map((c) => c._id) },
          isSomeday: false,
        });

        const regularEvents = currentEventsInDb.filter(
          (e) => !isBase(e) && !isInstance(e),
        );

        expect(
          new Set(regularEvents.map(({ _id }) => _id.toString())).size,
        ).toBe(regularEvents.length);
      });

      it("should resume import using stored nextPageToken", async () => {
        const { user, websocketClient } = await websocketUserFlow(true);
        const userId = user._id.toString();

        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        const { sync } = await userService.fetchUserMetadata(userId);

        expect(sync?.importGCal).toEqual("completed");

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "restart" } },
        });

        await syncDriver.waitUntilImportGCalEnd(websocketClient, () =>
          syncDriver.importGCal({ userId }),
        );

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });
    });

    describe("Import Status: ", () => {
      it("should not retry import once it has completed", async () => {
        const { user, websocketClient } = await websocketUserFlow(true);
        const userId = user._id.toString();

        const { sync } = await userService.fetchUserMetadata(userId);

        expect(sync?.importGCal).toEqual("completed");

        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toEqual(
          `User ${userId} gcal import is in progress or completed, ignoring this request`,
        );

        expect(getAllEventsSpy).not.toHaveBeenCalled();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });

      it("should not retry import if it is in progress", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const newUser = await AuthDriver.googleSignup();
        const user = await AuthDriver.googleLogin(newUser._id);
        const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
        const userId = user._id.toString();

        // cause restart sync
        await updateSync(
          Resource_Sync.EVENTS,
          calendar.user.toString(),
          calendar.metadata.id,
          {
            nextSyncToken: undefined,
          },
        );

        await AuthDriver.googleLogin(user._id);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId, sessionId: randomUUID() },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "importing" } },
        });

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toEqual(
          `User ${userId} gcal import is in progress or completed, ignoring this request`,
        );

        expect(getAllEventsSpy).not.toHaveBeenCalled();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });

      it("should retry import if it is restarted", async () => {
        const user = await AuthDriver.googleSignup();
        const userId = user._id.toString();

        await AuthDriver.googleLogin(user._id);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId, sessionId: randomUUID() },
          { autoConnect: false },
        );

        // @TODO spy on importGCal
        // @TODO verify events before and after import

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "restart" } },
        });

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toBeNull();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );
      });

      it("should retry import if it failed", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const user = await AuthDriver.googleSignup();
        const userId = user._id.toString();

        await AuthDriver.googleLogin(user._id);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId, sessionId: randomUUID() },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "errored" } },
        });

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toBeNull();

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });
    });

    describe("Frontend Notifications", () => {
      it("should notify the frontend that the import has started", async () => {
        const user = await AuthDriver.googleSignup();
        const userId = user._id.toString();

        await AuthDriver.googleLogin(user._id);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await expect(
          syncDriver.waitUntilImportGCalStart<boolean>(
            websocketClient,
            () => syncDriver.importGCal({ userId }),
            () => Promise.resolve(true),
          ),
        ).resolves.toBeTruthy();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );
      });

      it("should notify the frontend that the import is complete", async () => {
        const user = await AuthDriver.googleSignup();
        const userId = user._id.toString();

        await AuthDriver.googleLogin(user._id);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await expect(
          syncDriver.waitUntilImportGCalEnd(
            websocketClient,
            () => syncDriver.importGCal({ userId }),
            (reason) => Promise.resolve(reason),
          ),
        ).resolves.toBeNull();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );
      });

      it("should notify the frontend to refetch the calendar events on completion", async () => {
        const user = await AuthDriver.googleSignup();
        const userId = user._id.toString();

        await AuthDriver.googleLogin(user._id);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await expect(
          baseDriver.waitUntilWebsocketEvent(
            websocketClient,
            EVENT_CHANGED,
            () => syncDriver.importGCal({ userId }),
            () => Promise.resolve(true),
          ),
        ).resolves.toBeTruthy();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );
      });
    });
  });
});
