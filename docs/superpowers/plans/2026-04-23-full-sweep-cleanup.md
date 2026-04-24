# Full Sweep Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up Compass in one branch by making sync/live updates more reliable, strengthening the supporting tests, and simplifying calendar draft editing.

**Architecture:** Preserve public behavior and existing callers while splitting the busiest sync service into focused modules behind the current `syncService` facade. Add targeted tests around the extracted responsibilities, then extract pure web draft decision helpers without changing the repo's intentional front-end state model.

**Tech Stack:** Bun 1.2.18, TypeScript, Express, MongoDB, Jest, Bun test, React, Redux Toolkit, redux-saga, Elf, Biome.

---

## Scope Check

This is one broad cleanup branch with three coupled phases, not three unrelated projects. The backend sync work is the center of gravity. Test/tooling work exists to protect that backend cleanup. Web draft cleanup is limited to the calendar editing flow and must not redesign the front-end state architecture.

## File Structure

Create:

- `packages/backend/src/sync/services/watch/sync.watch.service.ts`: owns Google watch creation, refresh, stop, and local watch deletion.
- `packages/backend/src/sync/services/watch/sync.watch.service.test.ts`: focused tests for watch behavior moved out of the monolithic service test.
- `packages/backend/src/sync/services/notify/sync.notification.service.ts`: owns incoming Google notifications and stale notification cleanup.
- `packages/backend/src/sync/services/notify/sync.notification.service.test.ts`: focused tests for notification outcomes.
- `packages/backend/src/sync/services/import/sync.import-runner.ts`: owns full import, incremental import, restart/repair, and start-sync orchestration.
- `packages/backend/src/sync/services/import/sync.import-runner.test.ts`: focused tests for import/restart outcomes.
- `packages/backend/src/sync/services/maintain/sync.maintenance-runner.ts`: owns all-user and per-user watch maintenance runs.
- `packages/backend/src/sync/services/outbound/sync.compass-to-google.ts`: owns Compass-originated event backfill after repair.
- `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.ts`: pure submit decision and edit payload helpers.
- `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.test.ts`: Bun tests for submit decisions.
- `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.ts`: pure drag/resize date helpers.
- `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.test.ts`: Bun tests for movement helpers.

Modify:

- `packages/backend/src/sync/services/sync.service.ts`: convert to a compatibility facade that delegates to focused services.
- `packages/backend/src/sync/services/sync.service.test.ts`: after focused tests pass, remove duplicated describe blocks for watch, notification, import, and repair coverage from lines 59-735 of the original file.
- `packages/backend/src/sync/services/import/sync.import.ts`: replace the import of `syncService` with `syncWatchService` to avoid circular dependencies.
- `packages/web/src/views/Calendar/components/Draft/hooks/actions/useDraftActions.ts`: call extracted submit and movement helpers while preserving the returned action contract.
- `docs/superpowers/specs/2026-04-23-full-sweep-cleanup-design.md`: keep as the source spec for this plan.
- `docs/superpowers/plans/2026-04-23-full-sweep-cleanup.md`: track execution progress.

## Chunk 1: Branch And Baseline

### Task 1: Prepare The One-Branch Workspace

**Files:**

- Modify: `docs/superpowers/plans/2026-04-23-full-sweep-cleanup.md`

- [ ] **Step 1: Confirm the worktree is clean**

Run:

```bash
git status --short
```

Expected: no output except this plan/spec if they have not been committed yet.

- [ ] **Step 2: Create or confirm the cleanup branch**

Run:

```bash
git branch --show-current
```

Expected: print the current branch. If it is `main`, run:

```bash
git switch -c refactor/full-sweep-cleanup
```

Expected: switched to `refactor/full-sweep-cleanup`.

- [ ] **Step 3: Capture the baseline tests**

Run:

```bash
bun run test:backend
```

Expected: PASS before the backend extraction starts. If this fails before any code change, record the failure in the final report and do not change code until the failure is understood.

- [ ] **Step 4: Commit the approved spec and plan**

Run:

```bash
git add -f docs/superpowers/specs/2026-04-23-full-sweep-cleanup-design.md docs/superpowers/plans/2026-04-23-full-sweep-cleanup.md
git commit -m "docs(config): add full sweep cleanup plan"
```

Expected: commit succeeds with only documentation files.

## Chunk 2: Backend Sync Watch Boundaries

### Task 2: Extract Google Watch Lifecycle

**Files:**

- Create: `packages/backend/src/sync/services/watch/sync.watch.service.ts`
- Create: `packages/backend/src/sync/services/watch/sync.watch.service.test.ts`
- Modify: `packages/backend/src/sync/services/sync.service.ts`
- Modify: `packages/backend/src/sync/services/sync.service.test.ts`

- [ ] **Step 1: Write the focused watch test first**

Create `packages/backend/src/sync/services/watch/sync.watch.service.test.ts` with this complete content before implementation:

```ts
import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { missingRefreshTokenError } from "@backend/__tests__/mocks.gcal/errors/error.missingRefreshToken";
import * as googleCalendarClient from "@backend/auth/services/google/clients/google.calendar.client";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";

const createWatch = async (user: string) => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user,
    resourceId: faker.string.uuid(),
    expiration: new Date(Date.now() + 60_000),
    gCalendarId: faker.string.uuid(),
    createdAt: new Date(),
  });

  await mongoService.watch.insertOne(watch);

  return watch;
};

describe("SyncWatchService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("deletes only the target user's watch records and returns identities", async () => {
    const firstUser = await UserDriver.createUser();
    const secondUser = await UserDriver.createUser();
    const firstUserWatch = await createWatch(firstUser._id.toString());
    const secondUserWatch = await createWatch(secondUser._id.toString());

    const deleted = await syncWatchService.deleteWatchesByUser(
      firstUser._id.toString(),
    );

    expect(deleted).toEqual([
      {
        channelId: firstUserWatch._id.toString(),
        resourceId: firstUserWatch.resourceId,
      },
    ]);
    expect(await mongoService.watch.findOne({ _id: firstUserWatch._id })).toBeNull();
    expect(await mongoService.watch.findOne({ _id: secondUserWatch._id })).toEqual(
      expect.objectContaining({ user: secondUser._id.toString() }),
    );
  });

  it("deletes the local watch record when Google returns invalid_grant", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());

    jest.spyOn(gcalService, "stopWatch").mockRejectedValue(invalidGrant400Error);

    await expect(
      syncWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).resolves.toBeUndefined();

    expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
  });

  it("deletes the local watch record when the user is missing a refresh token", async () => {
    const user = await UserDriver.createUser({ withGoogleRefreshToken: false });
    const watch = await createWatch(user._id.toString());

    jest
      .spyOn(gcalService, "stopWatch")
      .mockRejectedValue(missingRefreshTokenError);

    await expect(
      syncWatchService.stopWatch(
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
      .mockRejectedValue(createGoogleError({ code: "500", responseStatus: 500 }));

    await expect(
      syncWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).rejects.toMatchObject({ code: "500" });

    expect(await mongoService.watch.findOne({ _id: watch._id })).toEqual(
      expect.objectContaining({ user: user._id.toString() }),
    );
  });

  it("does not fetch a Google client when a user has no stored watches", async () => {
    const user = await UserDriver.createUser({ withGoogle: false });
    const getGcalClientSpy = jest.spyOn(googleCalendarClient, "getGcalClient");

    await expect(syncWatchService.stopWatches(user._id.toString())).resolves.toEqual([]);

    expect(getGcalClientSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the right reason**

Run:

```bash
bun run test:backend -- packages/backend/src/sync/services/watch/sync.watch.service.test.ts
```

Expected: FAIL because `@backend/sync/services/watch/sync.watch.service` does not exist.

- [ ] **Step 3: Implement `sync.watch.service.ts` by extracting the watch methods**

Create `sync.watch.service.ts` with a `SyncWatchService` class and copy these exact method ranges from `packages/backend/src/sync/services/sync.service.ts` as it exists before this task starts:

```text
Lines 65-72: deleteAllByGcalId
Lines 74-81: deleteAllByUser
Lines 83-89: deleteByIntegration
Lines 91-105: deleteWatchesByUser
Lines 107-140: prepareStopWatches
Lines 385-405: refreshWatch
Lines 672-725: startWatchingGcalCalendars
Lines 727-780: startWatchingGcalEvents
Lines 782-796: startWatchingGcalResources
Lines 798-855: stopWatch
Lines 857-898: stopWatches
```

The file starts with this import/export frame. Put the copied method ranges inside `SyncWatchService`, and keep `prepareStopWatches` private.

```ts
import { type ClientSession, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import {
  type Params_WatchEvents,
  Resource_Sync,
  type Result_Watch_Stop,
} from "@core/types/sync.types";
import { ExpirationDateSchema } from "@core/types/type.utils";
import { WatchSchema } from "@core/types/watch.types";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import { Collections } from "@backend/common/constants/collections";
import { error } from "@backend/common/errors/handlers/error.handler";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import { UserError } from "@backend/common/errors/user/user.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  getGoogleErrorStatus,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import {
  isWatchingGoogleResource,
} from "@backend/sync/util/sync.queries";
import {
  getChannelExpiration,
  isMissingGoogleRefreshToken,
} from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:sync.watch.service");

class SyncWatchService {
}

export const syncWatchService = new SyncWatchService();
export default syncWatchService;
```

The completed class must not be empty. It must contain every method listed in the extraction table above.

Run Biome on the file after extraction so imports are organized:

```bash
bunx biome check --write packages/backend/src/sync/services/watch/sync.watch.service.ts
```

Expected: Biome completes and leaves the extracted service formatted.

- [ ] **Step 4: Turn `sync.service.ts` watch methods into delegations**

In `sync.service.ts`, import the watch service:

```ts
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
```

Replace each moved method with a one-line delegation so existing spies and callers keep working:

```ts
deleteWatchesByUser = syncWatchService.deleteWatchesByUser;
refreshWatch = syncWatchService.refreshWatch;
startWatchingGcalResources = syncWatchService.startWatchingGcalResources;
stopWatch = syncWatchService.stopWatch;
stopWatches = syncWatchService.stopWatches;
```

Use this complete delegation list:

```ts
deleteAllByGcalId = syncWatchService.deleteAllByGcalId;
deleteAllByUser = syncWatchService.deleteAllByUser;
deleteByIntegration = syncWatchService.deleteByIntegration;
deleteWatchesByUser = syncWatchService.deleteWatchesByUser;
refreshWatch = syncWatchService.refreshWatch;
startWatchingGcalCalendars = syncWatchService.startWatchingGcalCalendars;
startWatchingGcalEvents = syncWatchService.startWatchingGcalEvents;
startWatchingGcalResources = syncWatchService.startWatchingGcalResources;
stopWatch = syncWatchService.stopWatch;
stopWatches = syncWatchService.stopWatches;
```

- [ ] **Step 5: Run the watch tests**

Run:

```bash
bun run test:backend -- packages/backend/src/sync/services/watch/sync.watch.service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run the existing sync service tests**

Run:

```bash
bun run test:backend -- packages/backend/src/sync/services/sync.service.test.ts
```

Expected: PASS. If a spy on `syncService.stopWatch` no longer sees calls from extracted code, update that test to spy on `syncWatchService.stopWatch` instead.

- [ ] **Step 7: Commit**

Run:

```bash
git add packages/backend/src/sync/services/watch/sync.watch.service.ts packages/backend/src/sync/services/watch/sync.watch.service.test.ts packages/backend/src/sync/services/sync.service.ts packages/backend/src/sync/services/sync.service.test.ts
git commit -m "refactor(backend): extract sync watch service"
```

Expected: commit succeeds.

## Chunk 3: Backend Notification And Import Boundaries

### Task 3: Extract Google Notification Handling

**Files:**

- Create: `packages/backend/src/sync/services/notify/sync.notification.service.ts`
- Create: `packages/backend/src/sync/services/notify/sync.notification.service.test.ts`
- Modify: `packages/backend/src/sync/services/sync.service.ts`

- [ ] **Step 1: Write notification service tests**

Create `packages/backend/src/sync/services/notify/sync.notification.service.test.ts` with this complete content:

```ts
import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import syncNotificationService from "@backend/sync/services/notify/sync.notification.service";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";

const createWatch = async (user: string) => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user,
    resourceId: faker.string.uuid(),
    expiration: new Date(Date.now() + 60_000),
    gCalendarId: faker.string.uuid(),
    createdAt: new Date(),
  });

  await mongoService.watch.insertOne(watch);

  return watch;
};

describe("SyncNotificationService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("returns INITIALIZED for Google sync handshake notifications", async () => {
    await expect(
      syncNotificationService.handleGcalNotification({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.uuid(),
        resourceState: XGoogleResourceState.SYNC,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe("INITIALIZED");
  });

  it("returns IGNORED when no matching active watch exists", async () => {
    await expect(
      syncNotificationService.handleGcalNotification({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.uuid(),
        resourceState: XGoogleResourceState.EXISTS,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe("IGNORED");
  });

  it("cleans up an exact stale watch and returns true", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());
    const stopWatchSpy = jest
      .spyOn(syncWatchService, "stopWatch")
      .mockResolvedValue({
        channelId: watch._id.toString(),
        resourceId: watch.resourceId,
      });

    await expect(
      syncNotificationService.cleanupStaleWatchChannel({
        resource: Resource_Sync.EVENTS,
        channelId: watch._id,
        resourceId: watch.resourceId,
        resourceState: XGoogleResourceState.EXISTS,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe(true);

    expect(stopWatchSpy).toHaveBeenCalledWith(
      user._id.toString(),
      watch._id.toString(),
      watch.resourceId,
    );
  });
});
```

- [ ] **Step 2: Run the new notification tests and verify failure**

Run:

```bash
bun run test:backend -- packages/backend/src/sync/services/notify/sync.notification.service.test.ts
```

Expected: FAIL because the service file does not exist.

- [ ] **Step 3: Implement notification service**

Create `sync.notification.service.ts` by copying these exact method ranges from the pre-extraction `sync.service.ts`:

```text
Lines 142-179: cleanupStaleWatchChannel
Lines 181-264: handleGcalNotification
```

After copying, change the stale cleanup call in `cleanupStaleWatchChannel` from `this.stopWatch` with its original arguments to `syncWatchService.stopWatch` with the same arguments. Keep `handleGcalNotification` calling `this.cleanupStaleWatchChannel(payload)`.

Export:

```ts
import { Logger } from "@core/logger/winston.logger";
import {
  type Payload_Sync_Notif,
  XGoogleResourceState,
} from "@core/types/sync.types";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import { getSync } from "@backend/sync/util/sync.queries";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";

const logger = Logger("app:sync.notification.service");

class SyncNotificationService {
}

export const syncNotificationService = new SyncNotificationService();
export default syncNotificationService;
```

The completed class must contain both copied methods. `cleanupStaleWatchChannel` must call `syncWatchService.stopWatch`, and `handleGcalNotification` must call `this.cleanupStaleWatchChannel(payload)`.

Run:

```bash
bunx biome check --write packages/backend/src/sync/services/notify/sync.notification.service.ts packages/backend/src/sync/services/notify/sync.notification.service.test.ts
```

Expected: Biome completes and leaves the files formatted.

- [ ] **Step 4: Delegate through the facade**

In `sync.service.ts`, import and delegate:

```ts
import syncNotificationService from "@backend/sync/services/notify/sync.notification.service";

cleanupStaleWatchChannel = syncNotificationService.cleanupStaleWatchChannel;
handleGcalNotification = syncNotificationService.handleGcalNotification;
```

- [ ] **Step 5: Run notification and full sync service tests**

Run:

```bash
bun run test:backend -- packages/backend/src/sync/services/notify/sync.notification.service.test.ts packages/backend/src/sync/services/sync.service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add packages/backend/src/sync/services/notify/sync.notification.service.ts packages/backend/src/sync/services/notify/sync.notification.service.test.ts packages/backend/src/sync/services/sync.service.ts packages/backend/src/sync/services/sync.service.test.ts
git commit -m "refactor(backend): extract sync notification handling"
```

Expected: commit succeeds.

### Task 4: Extract Import, Repair, Maintenance, And Compass Backfill

**Files:**

- Create: `packages/backend/src/sync/services/import/sync.import-runner.ts`
- Create: `packages/backend/src/sync/services/import/sync.import-runner.test.ts`
- Create: `packages/backend/src/sync/services/maintain/sync.maintenance-runner.ts`
- Create: `packages/backend/src/sync/services/outbound/sync.compass-to-google.ts`
- Modify: `packages/backend/src/sync/services/import/sync.import.ts`
- Modify: `packages/backend/src/sync/services/sync.service.ts`
- Modify: `packages/backend/src/sync/services/sync.service.test.ts`

- [ ] **Step 1: Write import runner tests**

Create `sync.import-runner.test.ts` by copying the import/setup block from `sync.service.test.ts` and then copying these exact describe ranges from the same file:

```text
Lines 282-349: complete describe block named "importIncremental"
Lines 351-444: complete describe block named "startGoogleCalendarSync"
Lines 446-735: complete describe block named "restartGoogleCalendarSync"
```

In the copied test file, replace every direct call to `syncService.importIncremental`, `syncService.startGoogleCalendarSync`, and `syncService.restartGoogleCalendarSync` with `syncImportRunner.importIncremental`, `syncImportRunner.startGoogleCalendarSync`, and `syncImportRunner.restartGoogleCalendarSync`.

Add this import:

```ts
import syncImportRunner from "@backend/sync/services/import/sync.import-runner";
```

Use these spy replacements in the copied tests:

```text
jest.spyOn(syncService, "importFull") -> jest.spyOn(syncImportRunner, "importFull")
jest.spyOn(syncService, "startWatchingGcalResources") -> jest.spyOn(syncWatchService, "startWatchingGcalResources")
jest.spyOn(syncService, "startGoogleCalendarSync") -> jest.spyOn(syncImportRunner, "startGoogleCalendarSync")
```

- [ ] **Step 2: Run import runner tests and verify failure**

Run:

```bash
bun run test:backend -- packages/backend/src/sync/services/import/sync.import-runner.test.ts
```

Expected: FAIL because `sync.import-runner.ts` does not exist.

- [ ] **Step 3: Create Compass backfill helper**

Create `packages/backend/src/sync/services/outbound/sync.compass-to-google.ts` by copying exact lines 901-978 from the pre-extraction `sync.service.ts`. The resulting file must start with these imports and export the full copied function body:

```ts
import { type Filter } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  type Schema_Event,
  type Schema_Event_Core,
} from "@core/types/event.types";
import mongoService from "@backend/common/services/mongo.service";
import { _createGcal } from "@backend/event/services/event.service";

export const syncCompassEventsToGoogle = async (
  userId: string,
): Promise<number> => {
};
```

The completed function must not be empty. Its body is the original body from lines 902-977.

- [ ] **Step 4: Create maintenance runner**

Create `sync.maintenance-runner.ts` by copying exact lines 407-525 from the pre-extraction `sync.service.ts`. The resulting file starts with this import/export frame:

```ts
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";
import {
  prepWatchMaintenanceForUser,
  pruneSync,
  refreshWatch,
} from "@backend/sync/services/maintain/sync.maintenance";
import { createConcurrencyLimiter } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:sync.maintenance-runner");

class SyncMaintenanceRunner {
}

export const syncMaintenanceRunner = new SyncMaintenanceRunner();
export default syncMaintenanceRunner;
```

The completed class must contain `runMaintenance` from original lines 407-470 and `runMaintenanceByUser` from original lines 472-525.

- [ ] **Step 5: Create import runner**

Create `sync.import-runner.ts` by copying these exact method ranges from the pre-extraction `sync.service.ts`:

```text
Line 63: activeFullSyncRestarts private property
Lines 266-308: importFull
Lines 310-383: importIncremental
Lines 527-630: restartGoogleCalendarSync
Lines 632-670: startGoogleCalendarSync
```

The resulting file must use these imports:

```ts
import { type ClientSession } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import {
  shouldDoIncrementalGCalSync,
  shouldImportGCal,
} from "@core/util/event/event.util";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import calendarService from "@backend/calendar/services/calendar.service";
import { getGoogleRepairErrorMessage } from "@backend/common/errors/integration/gcal/gcal.errors";
import { isInvalidGoogleToken } from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { createSyncImport } from "@backend/sync/services/import/sync.import";
import { syncCompassEventsToGoogle } from "@backend/sync/services/outbound/sync.compass-to-google";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
import { updateSync } from "@backend/sync/util/sync.queries";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import userMetadataService from "@backend/user/services/user-metadata.service";
import { sseServer } from "@backend/servers/sse/sse.server";

const logger = Logger("app:sync.import-runner");

class SyncImportRunner {
  private activeFullSyncRestarts = new Set<string>();
}
export const syncImportRunner = new SyncImportRunner();
export default syncImportRunner;
```

The completed class must contain `importFull`, `importIncremental`, `restartGoogleCalendarSync`, and `startGoogleCalendarSync` from the source ranges above.

After pasting, make these exact replacements inside the copied methods:

```text
this.startWatchingGcalResources with the existing argument list -> syncWatchService.startWatchingGcalResources with the same argument list
this.importFull with the existing argument list -> this.importFull with the same argument list
syncCompassEventsToGoogle(userId) -> syncCompassEventsToGoogle(userId)
```

Keep `this.importFull` inside `startGoogleCalendarSync` so tests can spy on the runner's `importFull` method.

- [ ] **Step 6: Break the import circular dependency**

In `packages/backend/src/sync/services/import/sync.import.ts`, replace:

```ts
import syncService from "@backend/sync/services/sync.service";
```

with:

```ts
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
```

Then replace:

```ts
await syncService.startWatchingGcalResources(
```

with:

```ts
await syncWatchService.startWatchingGcalResources(
```

- [ ] **Step 7: Delegate through `sync.service.ts`**

In `sync.service.ts`, import all focused services and reduce the class to facade delegations:

```ts
import syncImportRunner from "@backend/sync/services/import/sync.import-runner";
import syncMaintenanceRunner from "@backend/sync/services/maintain/sync.maintenance-runner";
import syncNotificationService from "@backend/sync/services/notify/sync.notification.service";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";

class SyncService {
  cleanupStaleWatchChannel = syncNotificationService.cleanupStaleWatchChannel;
  deleteAllByGcalId = syncWatchService.deleteAllByGcalId;
  deleteAllByUser = syncWatchService.deleteAllByUser;
  deleteByIntegration = syncWatchService.deleteByIntegration;
  deleteWatchesByUser = syncWatchService.deleteWatchesByUser;
  handleGcalNotification = syncNotificationService.handleGcalNotification;
  importFull = syncImportRunner.importFull;
  importIncremental = syncImportRunner.importIncremental;
  refreshWatch = syncWatchService.refreshWatch;
  restartGoogleCalendarSync = syncImportRunner.restartGoogleCalendarSync;
  runMaintenance = syncMaintenanceRunner.runMaintenance;
  runMaintenanceByUser = syncMaintenanceRunner.runMaintenanceByUser;
  startGoogleCalendarSync = syncImportRunner.startGoogleCalendarSync;
  startWatchingGcalCalendars = syncWatchService.startWatchingGcalCalendars;
  startWatchingGcalEvents = syncWatchService.startWatchingGcalEvents;
  startWatchingGcalResources = syncWatchService.startWatchingGcalResources;
  stopWatch = syncWatchService.stopWatch;
  stopWatches = syncWatchService.stopWatches;
}

export default new SyncService();
```

- [ ] **Step 8: Run backend sync tests**

Run:

```bash
bun run test:backend -- packages/backend/src/sync/services/import/sync.import-runner.test.ts packages/backend/src/sync/services/sync.service.test.ts packages/backend/src/sync/services/import/sync.import.full.test.ts packages/backend/src/sync/services/import/sync.import.series.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run the backend package tests**

Run:

```bash
bun run test:backend
```

Expected: PASS.

- [ ] **Step 10: Commit**

Run:

```bash
git add packages/backend/src/sync/services/import/sync.import-runner.ts packages/backend/src/sync/services/import/sync.import-runner.test.ts packages/backend/src/sync/services/maintain/sync.maintenance-runner.ts packages/backend/src/sync/services/outbound/sync.compass-to-google.ts packages/backend/src/sync/services/import/sync.import.ts packages/backend/src/sync/services/sync.service.ts packages/backend/src/sync/services/sync.service.test.ts
git commit -m "refactor(backend): split sync import runners"
```

Expected: commit succeeds.

## Chunk 4: Web Draft Editing Boundaries

### Task 5: Extract Submit Decision Logic

**Files:**

- Create: `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.ts`
- Create: `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.test.ts`
- Modify: `packages/web/src/views/Calendar/components/Draft/hooks/actions/useDraftActions.ts`

- [ ] **Step 1: Write submit decision tests**

Create `draft.submit-decision.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { getDraftSubmitAction } from "./draft.submit-decision";

describe("getDraftSubmitAction", () => {
  it("creates a new event when the draft has no id", () => {
    expect(
      getDraftSubmitAction({
        draft: { title: "New" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: false,
        isDirty: false,
      }),
    ).toBe("CREATE");
  });

  it("discards a pending event update", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "pending-id", title: "Pending" },
        pendingEventIds: ["pending-id"],
        isFormOpenBeforeDragging: false,
        isDirty: true,
      }),
    ).toBe("DISCARD");
  });

  it("opens the form again after a drag that started from an open form", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "event-id", title: "Existing" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: true,
        isDirty: true,
      }),
    ).toBe("OPEN_FORM");
  });

  it("discards unchanged existing events", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "event-id", title: "Existing" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: false,
        isDirty: false,
      }),
    ).toBe("DISCARD");
  });

  it("updates changed existing events", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "event-id", title: "Existing" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: false,
        isDirty: true,
      }),
    ).toBe("UPDATE");
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
bun test packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.test.ts
```

Expected: FAIL because `draft.submit-decision.ts` does not exist.

- [ ] **Step 3: Implement the submit decision helper**

Create `draft.submit-decision.ts`:

```ts
export type DraftSubmitAction = "CREATE" | "DISCARD" | "OPEN_FORM" | "UPDATE";

type DraftIdentity = {
  _id?: string | null;
};

interface Params_GetDraftSubmitAction {
  draft: DraftIdentity;
  pendingEventIds: string[];
  isFormOpenBeforeDragging: boolean | null;
  isDirty: boolean;
}

export const getDraftSubmitAction = ({
  draft,
  pendingEventIds,
  isFormOpenBeforeDragging,
  isDirty,
}: Params_GetDraftSubmitAction): DraftSubmitAction => {
  if (!draft._id) return "CREATE";

  if (pendingEventIds.includes(draft._id)) return "DISCARD";

  if (isFormOpenBeforeDragging) return "OPEN_FORM";

  if (!isDirty) return "DISCARD";

  return "UPDATE";
};
```

- [ ] **Step 4: Replace `determineSubmitAction` internals**

In `useDraftActions.ts`, import:

```ts
import { getDraftSubmitAction } from "@web/views/Calendar/components/Draft/hooks/actions/draft.submit-decision";
```

Replace the body of `determineSubmitAction` with:

```ts
const isDirty = reduxDraft
  ? DirtyParser.isEventDirty(draft, reduxDraft)
  : true;

return getDraftSubmitAction({
  draft,
  pendingEventIds,
  isFormOpenBeforeDragging,
  isDirty,
});
```

- [ ] **Step 5: Run focused web tests**

Run:

```bash
bun test packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.test.ts packages/web/src/views/Calendar/components/Draft/hooks/actions/submit.parser.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.ts packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.test.ts packages/web/src/views/Calendar/components/Draft/hooks/actions/useDraftActions.ts
git commit -m "refactor(web): extract draft submit decisions"
```

Expected: commit succeeds.

### Task 6: Extract Draft Movement Helpers

**Files:**

- Create: `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.ts`
- Create: `packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.test.ts`
- Modify: `packages/web/src/views/Calendar/components/Draft/hooks/actions/useDraftActions.ts`

- [ ] **Step 1: Write movement helper tests**

Create `draft.movement.test.ts`:

```ts
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { describe, expect, it } from "bun:test";
import {
  getDraggedEventDateRange,
  getIsValidResizeMovement,
} from "./draft.movement";

describe("draft movement helpers", () => {
  it("keeps timed drag ranges within the same day when the end would overflow", () => {
    const start = dayjs("2024-01-15T23:45:00.000Z");

    const result = getDraggedEventDateRange({
      eventStart: start,
      durationMin: 60,
      isAllDay: false,
    });

    expect(dayjs(result.startDate).date()).toBe(dayjs(result.endDate).date());
  });

  it("formats all-day drag ranges as date-only values", () => {
    const start = dayjs("2024-01-15T09:00:00.000Z");

    const result = getDraggedEventDateRange({
      eventStart: start,
      durationMin: 1440,
      isAllDay: true,
    });

    expect(result.startDate).toBe(start.format(YEAR_MONTH_DAY_FORMAT));
    expect(result.endDate).toBe(start.add(1440, "minutes").format(YEAR_MONTH_DAY_FORMAT));
  });

  it("rejects resize movement that changes a timed event to another day", () => {
    expect(
      getIsValidResizeMovement({
        currTime: dayjs("2024-01-16T10:00:00.000Z"),
        draftStartDate: "2024-01-15T09:00:00.000Z",
        currentValue: "2024-01-15T10:00:00.000Z",
        dateBeingChanged: "endDate",
        isAllDay: false,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
bun test packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.test.ts
```

Expected: FAIL because `draft.movement.ts` does not exist.

- [ ] **Step 3: Implement movement helpers**

Create `draft.movement.ts`:

```ts
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

interface Params_GetDraggedEventDateRange {
  eventStart: Dayjs;
  durationMin: number;
  isAllDay: boolean;
}

export const getDraggedEventDateRange = ({
  eventStart,
  durationMin,
  isAllDay,
}: Params_GetDraggedEventDateRange) => {
  let adjustedStart = eventStart;
  let adjustedEnd = eventStart.add(durationMin, "minutes");

  if (!isAllDay && adjustedEnd.date() !== adjustedStart.date()) {
    adjustedEnd = adjustedEnd.hour(0).minute(0);
    adjustedStart = adjustedEnd.subtract(durationMin, "minutes");
  }

  return {
    startDate: isAllDay
      ? adjustedStart.format(YEAR_MONTH_DAY_FORMAT)
      : adjustedStart.format(),
    endDate: isAllDay
      ? adjustedEnd.format(YEAR_MONTH_DAY_FORMAT)
      : adjustedEnd.format(),
  };
};

interface Params_GetIsValidResizeMovement {
  currTime: Dayjs;
  draftStartDate: string;
  currentValue?: string;
  dateBeingChanged: "startDate" | "endDate" | null;
  isAllDay: boolean;
}

export const getIsValidResizeMovement = ({
  currTime,
  draftStartDate,
  currentValue,
  dateBeingChanged,
  isAllDay,
}: Params_GetIsValidResizeMovement) => {
  if (!dateBeingChanged) return false;
  if (isAllDay) return true;

  const formatted = currTime.format();
  if (currentValue === formatted) return false;

  const isDifferentDay = currTime.day() !== dayjs(draftStartDate).day();
  if (isDifferentDay) return false;

  return formatted !== draftStartDate;
};
```

- [ ] **Step 4: Use movement helper in drag**

In `useDraftActions.ts`, import:

```ts
import {
  getDraggedEventDateRange,
  getIsValidResizeMovement,
} from "@web/views/Calendar/components/Draft/hooks/actions/draft.movement";
```

Inside `updateTimesDuringDrag`, replace manual `eventEnd` overflow and date formatting logic with:

```ts
const { startDate, endDate } = getDraggedEventDateRange({
  eventStart,
  durationMin: startEndDurationMin,
  isAllDay: draft.isAllDay,
});

const _draft: Schema_GridEvent = {
  ...draft,
  startDate,
  endDate,
  priority: draft.priority || Priorities.UNASSIGNED,
};
```

- [ ] **Step 5: Use movement helper in resize validation**

Replace the body of `isValidMovement` with:

```ts
if (!draft || !dateBeingChanged) return false;

return getIsValidResizeMovement({
  currTime,
  draftStartDate: draft.startDate,
  currentValue: draft[dateBeingChanged],
  dateBeingChanged,
  isAllDay: draft.isAllDay,
});
```

- [ ] **Step 6: Run focused web tests**

Run:

```bash
bun test packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.test.ts packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.submit-decision.test.ts packages/web/src/views/Calendar/components/Draft/hooks/actions/submit.parser.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run the web package tests**

Run:

```bash
bun run test:web
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.ts packages/web/src/views/Calendar/components/Draft/hooks/actions/draft.movement.test.ts packages/web/src/views/Calendar/components/Draft/hooks/actions/useDraftActions.ts
git commit -m "refactor(web): extract draft movement helpers"
```

Expected: commit succeeds.

## Chunk 5: Final Validation And Report

### Task 7: Run Full Validation

**Files:**

- Modify: `docs/superpowers/plans/2026-04-23-full-sweep-cleanup.md`

- [ ] **Step 1: Run core tests**

Run:

```bash
bun run test:core
```

Expected: PASS.

- [ ] **Step 2: Run backend tests**

Run:

```bash
bun run test:backend
```

Expected: PASS.

- [ ] **Step 3: Run web tests**

Run:

```bash
bun run test:web
```

Expected: PASS.

- [ ] **Step 4: Run type-check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [ ] **Step 5: Run lint**

Run:

```bash
bun run lint
```

Expected: PASS.

- [ ] **Step 6: Inspect the diff**

Run:

```bash
git diff --stat HEAD~5..HEAD
git status --short
```

Expected: diff is limited to sync extraction, tests, web draft helpers, the spec, and this plan. `git status --short` should be clean after commits.

### Task 8: Write The Plain-English Report

**Files:**

- Create: `docs/superpowers/reports/2026-04-23-full-sweep-cleanup-report.md`

- [ ] **Step 1: Create the report directory**

Run:

```bash
mkdir -p docs/superpowers/reports
```

Expected: directory exists.

- [ ] **Step 2: Write the report**

Create `docs/superpowers/reports/2026-04-23-full-sweep-cleanup-report.md` with this structure:

```md
# Full Sweep Cleanup Report

## What Changed

The backend sync code was split into smaller pieces with clearer jobs. Google watch handling, incoming Google notifications, import and repair flows, maintenance work, and Compass-to-Google backfill now live behind focused modules while the existing sync service entrypoint still works for callers.

The tests were strengthened around the sync flows most likely to break during cleanup: stale watches, duplicate repair requests, failed imports, revoked Google access, and quota failures.

The calendar editing code on the web side now has separate helpers for submit decisions and movement calculations, so the main draft hook is easier to follow.

## What Was Verified

- `bun run test:core`
- `bun run test:backend`
- `bun run test:web`
- `bun run type-check`
- `bun run lint`

## Behavior Notes

The cleanup preserved the intended product behavior. Any behavior changes were limited to reliability fixes found while working through sync failure paths.

## Remaining Risk

The sync area still touches external Google behavior, so local tests cannot prove every production Google edge case. The new structure makes those cases easier to isolate and fix.
```

- [ ] **Step 3: Commit the report**

Run:

```bash
git add -f docs/superpowers/reports/2026-04-23-full-sweep-cleanup-report.md docs/superpowers/plans/2026-04-23-full-sweep-cleanup.md
git commit -m "docs(config): report full sweep cleanup"
```

Expected: commit succeeds.

## Self-Review

Spec coverage:

- Backend sync reliability is covered by Tasks 2, 3, and 4.
- Test and tooling support is covered by focused tests in Tasks 2 through 6 and full validation in Task 7.
- Web editing clarity is covered by Tasks 5 and 6.
- Plain-English reporting is covered by Task 8.

Placeholder scan:

- The plan does not contain `TBD`, `TODO`, `implement later`, or `fill in details`.
- Code-changing steps include concrete file names, commands, target code, or exact source ranges for mechanical extraction.

Type consistency:

- Backend extracted services are singleton default exports that match the current `syncService` usage pattern.
- Web helper names match the imports used by `useDraftActions.ts`.
- Commit scopes match repo conventions: `refactor(backend)`, `refactor(web)`, and `docs(config)`.
