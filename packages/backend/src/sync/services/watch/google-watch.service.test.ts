import { faker } from "@faker-js/faker";
import { type GaxiosResponse } from "gaxios";
import { ObjectId } from "mongodb";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { type Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { GoogleSyncDriver } from "@backend/__tests__/drivers/google-sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { mockRegularGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { googleCalendarListService } from "@backend/sync/services/calendarlist/google-calendarlist.service";
import { seedGoogleCalendar } from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";

jest.mock("@backend/sync/services/watch/google-watch-config", () => {
  const actual = jest.requireActual(
    "@backend/sync/services/watch/google-watch-config",
  );
  return {
    ...actual,
    isUsingGcalWebhookHttps: jest.fn(() => actual.isUsingGcalWebhookHttps()),
  };
});

const createWatch = async (
  user: string,
  gCalendarId: string = faker.string.uuid(),
) => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user,
    resourceId: faker.string.uuid(),
    expiration: new Date(Date.now() + 60_000),
    gCalendarId,
    createdAt: new Date(),
  });

  await mongoService.watch.insertOne(watch);

  return watch;
};

/**
 * Seeds a user with healthy Google sync state, points gcalService.getEvents
 * at the given items, and returns a notify() bound to that user's events
 * watch. `seedCalendar` controls whether an owning CalendarRecord exists and
 * whether it is visible.
 */
const seedEventsNotification = async (options: {
  seedCalendar?: { isVisible: boolean };
  gcalItems: ReturnType<typeof mockRegularGcalEvent>[];
}) => {
  const user = await UserDriver.createUser();
  await GoogleSyncDriver.createHealthyGoogleSync(user, true);
  const userId = user._id.toString();

  const watch = await mongoService.watch.findOne({
    user: userId,
    gCalendarId: { $ne: Resource_Sync.CALENDAR },
  });
  if (!watch) throw new Error("expected an events watch from the sync driver");

  const calendar = options.seedCalendar
    ? await seedGoogleCalendar(user._id, {
        isVisible: options.seedCalendar.isVisible,
        source: {
          provider: "google",
          calendarId: watch.gCalendarId,
          etag: "etag-1",
        },
      })
    : null;

  jest.spyOn(gcalService, "getEvents").mockResolvedValue({
    status: 200,
    statusText: "OK",
    data: { items: options.gcalItems },
  } as unknown as GaxiosResponse);
  const eventsChangedSpy = jest.spyOn(sseServer, "publishEventsChanged");

  const notify = () =>
    googleWatchService.handleGoogleWatchNotification({
      resource: Resource_Sync.EVENTS,
      channelId: watch._id,
      resourceId: watch.resourceId,
      resourceState: XGoogleResourceState.EXISTS,
      expiration: watch.expiration,
    });

  return { userId, calendar, eventsChangedSpy, notify };
};

describe("googleWatchService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("deletes only the target user's watch records and returns their identities", async () => {
    const firstUser = await UserDriver.createUser();
    const secondUser = await UserDriver.createUser();
    const firstUserWatch = await createWatch(firstUser._id.toString());
    const secondUserWatch = await createWatch(secondUser._id.toString());

    const deleted = await googleWatchService.deleteWatchesByUser(
      firstUser._id.toString(),
    );

    expect(deleted).toEqual([
      {
        channelId: firstUserWatch._id.toString(),
        resourceId: firstUserWatch.resourceId,
      },
    ]);
    expect(
      await mongoService.watch.findOne({ _id: firstUserWatch._id }),
    ).toBeNull();
    expect(
      await mongoService.watch.findOne({ _id: secondUserWatch._id }),
    ).toEqual(expect.objectContaining({ user: secondUser._id.toString() }));
  });

  it("deletes the local watch record when Google returns invalid_grant", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());

    jest
      .spyOn(gcalService, "stopWatch")
      .mockRejectedValue(invalidGrant400Error);

    await expect(
      googleWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).resolves.toBeUndefined();

    expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
  });

  it("rethrows unexpected Google stop errors and keeps the local watch", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());

    jest
      .spyOn(gcalService, "stopWatch")
      .mockRejectedValue(
        createGoogleError({ code: "500", responseStatus: 500 }),
      );

    await expect(
      googleWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).rejects.toMatchObject({ code: "500" });

    expect(await mongoService.watch.findOne({ _id: watch._id })).toEqual(
      expect.objectContaining({ user: user._id.toString() }),
    );
  });

  it("ignores expired notifications when no local watch record remains", async () => {
    const cleanupSpy = jest
      .spyOn(googleWatchService, "cleanupStaleWatch")
      .mockResolvedValue(false);

    await expect(
      googleWatchService.handleGoogleWatchNotification({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.uuid(),
        resourceState: XGoogleResourceState.EXISTS,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe("IGNORED");

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores a notification whose channelId matches but resourceId doesn't, leaving the real watch untouched", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());

    const cleanupSpy = jest.spyOn(googleWatchService, "cleanupStaleWatch");
    const stopWatchSpy = jest.spyOn(gcalService, "stopWatch");

    await expect(
      googleWatchService.handleGoogleWatchNotification({
        resource: Resource_Sync.EVENTS,
        channelId: watch._id,
        // Right channel, wrong resource - cleanupStaleWatch's exact
        // (channelId, resourceId) lookup misses this watch too, so there's
        // nothing to clean up.
        resourceId: faker.string.uuid(),
        resourceState: XGoogleResourceState.EXISTS,
        expiration: watch.expiration,
      }),
    ).resolves.toBe("IGNORED");

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(stopWatchSpy).not.toHaveBeenCalled();
    expect(await mongoService.watch.findOne({ _id: watch._id })).toEqual(
      expect.objectContaining({
        user: user._id.toString(),
        resourceId: watch.resourceId,
      }),
    );
  });

  it("cleans up a stale watch record when the notification's expiration is newer than the stored one", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    // Built directly rather than through WatchSchema.parse: its
    // ExpirationDateSchema requires a future date (correct for a freshly
    // created watch), but this fixture needs to represent one that's
    // already expired.
    const expiredWatch: Schema_Watch = {
      _id: new ObjectId(),
      user: userId,
      resourceId: faker.string.uuid(),
      expiration: new Date(Date.now() - 60_000), // already expired
      gCalendarId: faker.string.uuid(),
      createdAt: new Date(),
    };
    await mongoService.watch.insertOne(expiredWatch);

    const stopWatchSpy = jest.spyOn(gcalService, "stopWatch");

    await expect(
      googleWatchService.handleGoogleWatchNotification({
        resource: Resource_Sync.EVENTS,
        channelId: expiredWatch._id,
        resourceId: expiredWatch.resourceId,
        resourceState: XGoogleResourceState.EXISTS,
        // Newer than the stored (already expired) watch, so the exact
        // `expiration: {$gte: ...}` lookup misses and this falls through to
        // cleanupStaleWatch's looser (channelId, resourceId) lookup, which
        // finds and stops the stale record.
        expiration: new Date(),
      }),
    ).resolves.toBe("IGNORED");

    expect(stopWatchSpy).toHaveBeenCalled();
    expect(
      await mongoService.watch.findOne({ _id: expiredWatch._id }),
    ).toBeNull();
  });

  it("dispatches a calendarlist notification to the reconciler and returns its outcome", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    await updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
      nextSyncToken: faker.string.alphanumeric(16),
    });
    const watch = await createWatch(userId, Resource_Sync.CALENDAR);

    const getEventsSpy = jest.spyOn(gcalService, "getEvents");
    const reconcileSpy = jest
      .spyOn(googleCalendarListService, "reconcileCalendarList")
      .mockResolvedValue({ outcome: "RECONCILED" });

    await expect(
      googleWatchService.handleGoogleWatchNotification({
        resource: Resource_Sync.CALENDAR,
        channelId: watch._id,
        resourceId: watch.resourceId,
        resourceState: XGoogleResourceState.EXISTS,
        expiration: watch.expiration,
      }),
    ).resolves.toBe("RECONCILED");

    expect(reconcileSpy).toHaveBeenCalledWith(expect.anything(), userId);
    expect(getEventsSpy).not.toHaveBeenCalled();
  });

  it("returns IGNORED when the events handler finds no changes to process", async () => {
    const { eventsChangedSpy, notify } = await seedEventsNotification({
      gcalItems: [],
    });

    await expect(notify()).resolves.toBe("IGNORED");

    expect(eventsChangedSpy).not.toHaveBeenCalled();
  });

  it("suppresses the eventsChanged publish for a hidden calendar but still reports PROCESSED", async () => {
    const { eventsChangedSpy, notify } = await seedEventsNotification({
      seedCalendar: { isVisible: false },
      gcalItems: [mockRegularGcalEvent({ summary: "Hidden event" })],
    });

    await expect(notify()).resolves.toBe("PROCESSED");

    expect(eventsChangedSpy).not.toHaveBeenCalled();
  });

  it("publishes the eventsChanged for a visible calendar", async () => {
    const { userId, calendar, eventsChangedSpy, notify } =
      await seedEventsNotification({
        seedCalendar: { isVisible: true },
        gcalItems: [mockRegularGcalEvent({ summary: "Visible event" })],
      });

    await expect(notify()).resolves.toBe("PROCESSED");

    expect(eventsChangedSpy).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        calendarId: calendar!._id.toHexString(),
        reason: "reconciled",
      }),
    );
  });

  it("routes an events notification to the calendar its watch names, not any other calendar the user has (packet 06 step 9 secondary-calendar routing proof)", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    const primaryGCalId = faker.string.uuid();
    const secondaryGCalId = faker.string.uuid();

    await seedGoogleCalendar(user._id, {
      isPrimary: true,
      source: {
        provider: "google",
        calendarId: primaryGCalId,
        etag: "etag-1",
      },
    });
    const secondaryCalendar = await seedGoogleCalendar(user._id, {
      isPrimary: false,
      source: {
        provider: "google",
        calendarId: secondaryGCalId,
        etag: "etag-1",
      },
    });

    await updateSync(Resource_Sync.EVENTS, userId, primaryGCalId, {
      nextSyncToken: faker.string.alphanumeric(16),
    });
    await updateSync(Resource_Sync.EVENTS, userId, secondaryGCalId, {
      nextSyncToken: faker.string.alphanumeric(16),
    });

    await createWatch(userId, primaryGCalId);
    const secondaryWatch = await createWatch(userId, secondaryGCalId);

    const getEventsSpy = jest
      .spyOn(gcalService, "getEvents")
      .mockResolvedValue({
        status: 200,
        statusText: "OK",
        data: { items: [mockRegularGcalEvent({ summary: "Secondary event" })] },
      } as unknown as GaxiosResponse);
    const eventsChangedSpy = jest.spyOn(sseServer, "publishEventsChanged");

    // The notification only names the secondary watch's channel/resource -
    // no calendar id travels with it anywhere else. The stored watch is the
    // only thing that routes this to the right calendar.
    await expect(
      googleWatchService.handleGoogleWatchNotification({
        resource: Resource_Sync.EVENTS,
        channelId: secondaryWatch._id,
        resourceId: secondaryWatch.resourceId,
        resourceState: XGoogleResourceState.EXISTS,
        expiration: secondaryWatch.expiration,
      }),
    ).resolves.toBe("PROCESSED");

    expect(getEventsSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ calendarId: secondaryGCalId }),
    );
    expect(getEventsSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ calendarId: primaryGCalId }),
    );
    expect(eventsChangedSpy).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        calendarId: secondaryCalendar._id.toHexString(),
      }),
    );
  });

  it("skips direct Google watch setup when the Google webhook URL is not HTTPS", async () => {
    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(false);
    const startCalendarWatchSpy = jest.spyOn(
      googleWatchService,
      "startCalendarListWatch",
    );
    const startEventWatchSpy = jest.spyOn(
      googleWatchService,
      "startEventWatch",
    );

    await expect(
      googleWatchService.startGoogleWatches(
        "507f1f77bcf86cd799439011",
        [{ gCalendarId: Resource_Sync.CALENDAR }, { gCalendarId: "primary" }],
        {} as never,
      ),
    ).resolves.toEqual([]);

    expect(startCalendarWatchSpy).not.toHaveBeenCalled();
    expect(startEventWatchSpy).not.toHaveBeenCalled();
  });
});
