import { type EventSchedule } from "@core/types/event.contracts";
import { type gSchema$Event, type gSchema$Events } from "@core/types/gcal";
import { type SyncEventContent } from "@core/types/sync/event.contracts";
import {
  deriveGoogleEventId,
  type GoogleEventsApi,
  GoogleEventWriter,
} from "@sync/providers/google/google-event-writer.adapter";
import { googleInstanceEventId } from "@sync/providers/google/google-instance-id";
import { ProviderWriteError } from "@sync/providers/provider-event-writer.port";

// A gaxios-shaped error: a numeric HTTP status on `response`, an optional
// Google reason, and a request config that carries a bearer token (so tests can
// assert the token never survives onto a thrown error's cause).
const gError = (status: number, reason?: string) =>
  Object.assign(new Error(`google error ${status}`), {
    response: {
      status,
      data: reason ? { error: { errors: [{ reason }] } } : undefined,
    },
    config: { headers: { Authorization: "Bearer super-secret-token" } },
  });

const scriptedEvent = (id: string, etag = '"v1"'): gSchema$Event => ({
  kind: "calendar#event",
  id,
  etag,
  status: "confirmed",
  summary: "T",
  start: {
    dateTime: "2025-01-15T09:00:00-05:00",
    timeZone: "America/New_York",
  },
  end: { dateTime: "2025-01-15T10:00:00-05:00", timeZone: "America/New_York" },
});

const scriptedInstance = (
  id: string,
  originalStart: string,
  etag = '"v1"',
): gSchema$Event => ({
  kind: "calendar#event",
  id,
  etag,
  status: "confirmed",
  summary: "T",
  recurringEventId: "series-1",
  originalStartTime: { dateTime: originalStart },
  start: { dateTime: originalStart, timeZone: "America/New_York" },
  end: { dateTime: "2025-01-15T10:00:00-05:00", timeZone: "America/New_York" },
});

type Behavior = gSchema$Event | Error | undefined;
type InstancesBehavior = gSchema$Events | Error;

// A scriptable fake for the four Google event calls. Each method records its
// params and either returns its scripted result or throws its scripted error.
class FakeEventsApi implements GoogleEventsApi {
  calls = {
    insert: [] as Parameters<GoogleEventsApi["insert"]>[0][],
    patch: [] as Parameters<GoogleEventsApi["patch"]>[0][],
    delete: [] as Parameters<GoogleEventsApi["delete"]>[0][],
    get: [] as Parameters<GoogleEventsApi["get"]>[0][],
    instances: [] as Parameters<GoogleEventsApi["instances"]>[0][],
  };

  #instancesIndex = 0;

  constructor(
    private readonly behavior: {
      insert?: Behavior;
      patch?: Behavior;
      delete?: Behavior;
      get?: Behavior;
      instances?: InstancesBehavior | InstancesBehavior[];
    } = {},
  ) {}

  async insert(
    params: Parameters<GoogleEventsApi["insert"]>[0],
  ): Promise<gSchema$Event> {
    this.calls.insert.push(params);
    return this.#settle("insert", () =>
      scriptedEvent(params.requestBody.id as string),
    );
  }

  async patch(
    params: Parameters<GoogleEventsApi["patch"]>[0],
  ): Promise<gSchema$Event> {
    this.calls.patch.push(params);
    return this.#settle("patch", () => scriptedEvent(params.eventId, '"v2"'));
  }

  async delete(
    params: Parameters<GoogleEventsApi["delete"]>[0],
  ): Promise<void> {
    this.calls.delete.push(params);
    if (this.behavior.delete instanceof Error) throw this.behavior.delete;
  }

  async get(
    params: Parameters<GoogleEventsApi["get"]>[0],
  ): Promise<gSchema$Event> {
    this.calls.get.push(params);
    return this.#settle("get", () => scriptedEvent(params.eventId, '"vGet"'));
  }

  async instances(
    params: Parameters<GoogleEventsApi["instances"]>[0],
  ): Promise<gSchema$Events> {
    this.calls.instances.push(params);
    const scripted = Array.isArray(this.behavior.instances)
      ? this.behavior.instances[this.#instancesIndex++]
      : this.behavior.instances;
    if (scripted instanceof Error) throw scripted;
    return (
      scripted ?? {
        kind: "calendar#events",
        items: [
          scriptedInstance(`${params.eventId}_instance`, params.originalStart),
        ],
      }
    );
  }

  #settle(
    method: "insert" | "patch" | "get",
    fallback: () => gSchema$Event,
  ): gSchema$Event {
    const scripted = this.behavior[method];
    if (scripted instanceof Error) throw scripted;
    return (scripted as gSchema$Event) ?? fallback();
  }
}

const writerWith = (api: GoogleEventsApi) => {
  const tokens: string[] = [];
  const writer = new GoogleEventWriter((accessToken) => {
    tokens.push(accessToken);
    return api;
  });
  return { writer, tokens };
};

const content = (overrides: Partial<SyncEventContent> = {}): SyncEventContent =>
  ({
    title: "Title",
    description: "Desc",
    location: null,
    organizer: null,
    attendees: [],
    conference: null,
    ...overrides,
  }) as SyncEventContent;

const timedSchedule = {
  kind: "timed",
  start: "2025-01-15T09:00:00-05:00",
  end: "2025-01-15T10:00:00-05:00",
  timeZone: "America/New_York",
} as unknown as EventSchedule;

const allDaySchedule = {
  kind: "allDay",
  start: "2025-01-15",
  end: "2025-01-16",
} as unknown as EventSchedule;

const baseCreate = {
  accessToken: "at",
  calendarId: "cal@group.calendar.google.com",
  providerEventId: "abc12deadbeef00000000000",
  content: content(),
  schedule: timedSchedule,
  recurrence: { kind: "single" } as const,
  invitation: "none" as const,
};

const basePatch = {
  accessToken: "at",
  calendarId: "cal@group.calendar.google.com",
  providerEventId: "abc12deadbeef00000000000",
  expectedVersion: null,
  content: content(),
  schedule: timedSchedule,
  recurrence: { kind: "single" } as const,
  invitation: "none" as const,
};

describe("GoogleEventWriter", () => {
  it("creates at the caller's deterministic id and returns provider identity", async () => {
    const api = new FakeEventsApi();
    const { writer, tokens } = writerWith(api);

    const result = await writer.createEvent(baseCreate);

    expect(tokens).toEqual(["at"]);
    expect(api.calls.insert[0].requestBody.id).toBe("abc12deadbeef00000000000");
    expect(result).toEqual({
      providerEventId: "abc12deadbeef00000000000",
      providerVersion: '"v1"',
    });
  });

  it("returns iCalUID from the Google write response when present", async () => {
    const api = new FakeEventsApi({
      insert: {
        ...scriptedEvent("abc12deadbeef00000000000"),
        iCalUID: "abc12deadbeef00000000000@google.com",
      },
    });
    const { writer } = writerWith(api);

    const result = await writer.createEvent(baseCreate);

    expect(result).toEqual({
      providerEventId: "abc12deadbeef00000000000",
      providerVersion: '"v1"',
      icalUid: "abc12deadbeef00000000000@google.com",
    });
  });

  it("treats a duplicate-id create as success by reading the event back", async () => {
    // 409 => a prior attempt already created it; the retry must not fail.
    const api = new FakeEventsApi({ insert: gError(409, "duplicate") });
    const { writer } = writerWith(api);

    const result = await writer.createEvent(baseCreate);

    expect(api.calls.get[0].eventId).toBe("abc12deadbeef00000000000");
    expect(result.providerVersion).toBe('"vGet"');
  });

  it("classifies (and redacts) a failed read-back after a duplicate-id create", async () => {
    // The 409 recovery lookup itself fails: the error must be classified, not
    // leaked as a raw provider error carrying the bearer token.
    const api = new FakeEventsApi({
      insert: gError(409, "duplicate"),
      get: gError(503),
    });
    const { writer } = writerWith(api);

    const error = (await writer
      .createEvent(baseCreate)
      .catch((e) => e)) as ProviderWriteError;

    expect(error).toBeInstanceOf(ProviderWriteError);
    expect(error.reason).toBe("transient");
    expect(JSON.stringify(error.cause ?? {})).not.toContain(
      "super-secret-token",
    );
  });

  it("conditions a patch on the expected version via If-Match", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    const result = await writer.patchEvent({
      ...basePatch,
      expectedVersion: '"v1"',
    });

    expect(api.calls.patch[0].ifMatch).toBe('"v1"');
    expect(result.providerVersion).toBe('"v2"');
  });

  it("patches unconditionally when no version is known", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.patchEvent(basePatch);

    expect(api.calls.patch[0].ifMatch).toBeNull();
  });

  it("maps a precondition failure to versionConflict", async () => {
    const api = new FakeEventsApi({ patch: gError(412) });
    const { writer } = writerWith(api);

    const error = (await writer
      .patchEvent({ ...basePatch, expectedVersion: '"stale"' })
      .catch((e) => e)) as ProviderWriteError;

    expect(error).toBeInstanceOf(ProviderWriteError);
    expect(error.reason).toBe("versionConflict");
  });

  it("maps a non-quota 403 to readOnlyCalendar", async () => {
    const api = new FakeEventsApi({ patch: gError(403, "forbidden") });
    const { writer } = writerWith(api);

    const error = (await writer
      .patchEvent(basePatch)
      .catch((e) => e)) as ProviderWriteError;

    expect(error.reason).toBe("readOnlyCalendar");
  });

  it("maps a quota 403 to transient (retryable)", async () => {
    const api = new FakeEventsApi({ patch: gError(403, "rateLimitExceeded") });
    const { writer } = writerWith(api);

    const error = (await writer
      .patchEvent(basePatch)
      .catch((e) => e)) as ProviderWriteError;

    expect(error.reason).toBe("transient");
  });

  it("maps a 401 to authorizationRevoked", async () => {
    const api = new FakeEventsApi({ patch: gError(401) });
    const { writer } = writerWith(api);

    const error = (await writer
      .patchEvent(basePatch)
      .catch((e) => e)) as ProviderWriteError;

    expect(error.reason).toBe("authorizationRevoked");
  });

  it("maps a 5xx and a networkless failure to transient", async () => {
    const server = new FakeEventsApi({ patch: gError(503) });
    const network = new FakeEventsApi({ patch: new Error("ECONNRESET") });

    const a = (await writerWith(server)
      .writer.patchEvent(basePatch)
      .catch((e) => e)) as ProviderWriteError;
    const b = (await writerWith(network)
      .writer.patchEvent(basePatch)
      .catch((e) => e)) as ProviderWriteError;

    expect(a.reason).toBe("transient");
    expect(b.reason).toBe("transient");
  });

  it("deletes with the invitation intent and version precondition", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.deleteEvent({
      accessToken: "at",
      calendarId: "cal",
      providerEventId: "abc12deadbeef00000000000",
      expectedVersion: '"v9"',
      invitation: "all",
    });

    expect(api.calls.delete[0]).toMatchObject({
      eventId: "abc12deadbeef00000000000",
      sendUpdates: "all",
      ifMatch: '"v9"',
    });
  });

  it("treats deleting an already-absent event as success", async () => {
    const gone = new FakeEventsApi({ delete: gError(410) });
    const missing = new FakeEventsApi({ delete: gError(404) });

    await writerWith(gone).writer.deleteEvent({
      accessToken: "at",
      calendarId: "cal",
      providerEventId: "id00000",
      expectedVersion: null,
      invitation: "none",
    });
    await writerWith(missing).writer.deleteEvent({
      accessToken: "at",
      calendarId: "cal",
      providerEventId: "id00000",
      expectedVersion: null,
      invitation: "none",
    });
    // Neither rejected; both no-op deletes resolved.
    expect(gone.calls.delete).toHaveLength(1);
    expect(missing.calls.delete).toHaveLength(1);
  });

  it("still surfaces a precondition failure on delete", async () => {
    const api = new FakeEventsApi({ delete: gError(412) });
    const { writer } = writerWith(api);

    const error = (await writer
      .deleteEvent({
        accessToken: "at",
        calendarId: "cal",
        providerEventId: "id00000",
        expectedVersion: '"stale"',
        invitation: "none",
      })
      .catch((e) => e)) as ProviderWriteError;

    expect(error.reason).toBe("versionConflict");
  });

  it("writes series rules and clears them for a single edit", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.createEvent({
      ...baseCreate,
      recurrence: { kind: "series", rules: ["RRULE:FREQ=DAILY"] },
    });
    await writer.patchEvent({ ...basePatch, recurrence: { kind: "single" } });

    expect(api.calls.insert[0].requestBody.recurrence).toEqual([
      "RRULE:FREQ=DAILY",
    ]);
    // A series-to-single edit must clear the rules, not omit the key.
    expect(api.calls.patch[0].requestBody.recurrence).toBeNull();
  });

  it("omits the recurrence key entirely when patching a resolved instance", async () => {
    // Google rejects a `recurrence` key on an event resolved off a series via
    // fetchInstanceAt — unlike a single edit, this must OMIT the key, not
    // clear it with null.
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.patchEvent({ ...basePatch, recurrence: { kind: "instance" } });

    expect(api.calls.patch[0].requestBody).not.toHaveProperty("recurrence");
  });

  it("nulls the unused schedule keys so Google never sees both a date and a dateTime", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.createEvent({ ...baseCreate, schedule: timedSchedule });
    await writer.patchEvent({ ...basePatch, schedule: allDaySchedule });

    expect(api.calls.insert[0].requestBody.start).toEqual({
      date: null,
      dateTime: "2025-01-15T09:00:00-05:00",
      timeZone: "America/New_York",
    });
    expect(api.calls.patch[0].requestBody.start).toEqual({
      date: "2025-01-15",
      dateTime: null,
      timeZone: null,
    });
  });

  it("maps content.color onto Google colorId and omits colorId when unset", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.createEvent({
      ...baseCreate,
      content: content({ color: "blue" }),
    });
    await writer.patchEvent({ ...basePatch, content: content() });

    expect(api.calls.insert[0].requestBody.colorId).toBe("7");
    expect(api.calls.patch).toHaveLength(1);
    expect(api.calls.patch[0].requestBody).not.toHaveProperty("colorId");
  });

  it("clears Google colorId when content.color is null", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.patchEvent({
      ...basePatch,
      content: content({ color: null }),
    });

    expect(api.calls.patch).toHaveLength(1);
    expect(api.calls.patch[0].requestBody.colorId).toBeNull();
    expect(api.calls.patch[0]).not.toHaveProperty("eventLabelVersion");
  });

  it("clears eventLabelId under v1 before writing a slot colorId", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.patchEvent({
      ...basePatch,
      expectedVersion: '"etag-v1"',
      content: content({ color: "coral" }),
    });

    expect(api.calls.patch).toHaveLength(2);
    expect(api.calls.patch[0]).toMatchObject({
      requestBody: { eventLabelId: "" },
      sendUpdates: "none",
      eventLabelVersion: 1,
      ifMatch: '"etag-v1"',
    });
    expect(api.calls.patch[1]).toMatchObject({
      requestBody: { colorId: "4" },
      ifMatch: '"v2"',
    });
    expect(api.calls.patch[1]).not.toHaveProperty("eventLabelVersion");
    expect(api.calls.patch[1].requestBody).not.toHaveProperty("eventLabelId");
  });

  it("maps each invitation intent straight to sendUpdates", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    await writer.createEvent({ ...baseCreate, invitation: "all" });
    await writer.createEvent({ ...baseCreate, invitation: "externalOnly" });
    await writer.createEvent({ ...baseCreate, invitation: "none" });

    expect(api.calls.insert.map((c) => c.sendUpdates)).toEqual([
      "all",
      "externalOnly",
      "none",
    ]);
  });

  it("fetches an event back as a normalized read, or null when absent", async () => {
    const present = new FakeEventsApi();
    const absent = new FakeEventsApi({ get: gError(404) });

    const read = await writerWith(present).writer.fetchEvent({
      accessToken: "at",
      calendarId: "cal",
      providerEventId: "abc12deadbeef00000000000",
    });
    const missing = await writerWith(absent).writer.fetchEvent({
      accessToken: "at",
      calendarId: "cal",
      providerEventId: "missing0",
    });

    expect(read?.kind).toBe("event");
    expect(read?.providerEventId).toBe("abc12deadbeef00000000000");
    expect(missing).toBeNull();
  });

  it("resolves one occurrence by its original start via the instances filter", async () => {
    const api = new FakeEventsApi();
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      originalStartAt: "2025-01-15T09:00:00-05:00",
      scheduleKind: "timed",
    });

    expect(api.calls.instances[0]).toMatchObject({
      calendarId: "cal",
      eventId: "series-1",
      originalStart: "2025-01-15T09:00:00-05:00",
    });
    expect(read?.kind).toBe("event");
    expect(read?.providerEventId).toBe("series-1_instance");
  });

  it("truncates an all-day instance's originalStart to a bare date, matching how Google reports it", async () => {
    const api = new FakeEventsApi({
      instances: {
        kind: "calendar#events",
        items: [
          {
            kind: "calendar#event",
            id: "series-1_instance",
            etag: '"v1"',
            status: "confirmed",
            summary: "T",
            recurringEventId: "series-1",
            originalStartTime: { date: "2026-08-08" },
            start: { date: "2026-08-08" },
            end: { date: "2026-08-09" },
          },
        ],
      },
    });
    const { writer } = writerWith(api);

    await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      // Compass mints every recurrenceId as a full ISO datetime, all-day
      // instants included (UTC midnight) — the adapter must still send the
      // date-only form Google's originalStartTime.date reports.
      originalStartAt: "2026-08-08T00:00:00.000Z",
      scheduleKind: "allDay",
    });

    expect(api.calls.instances[0]).toMatchObject({
      calendarId: "cal",
      eventId: "series-1",
      originalStart: "2026-08-08",
    });
  });

  it("returns null when no instance exists at that instant", async () => {
    const api = new FakeEventsApi({
      instances: { kind: "calendar#events", items: [] },
      get: gError(404),
    });
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      originalStartAt: "2025-01-15T09:00:00-05:00",
      scheduleKind: "timed",
    });

    expect(read).toBeNull();
    expect(api.calls.get[0]?.eventId).toBe(
      googleInstanceEventId("series-1", "2025-01-15T09:00:00-05:00", "timed"),
    );
  });

  it("retries an all-day originalStart as RFC3339 UTC midnight after Google 400s the date-only filter", async () => {
    const api = new FakeEventsApi({
      instances: [
        gError(400),
        {
          kind: "calendar#events",
          items: [
            {
              kind: "calendar#event",
              id: "series-1_20260820",
              etag: '"v1"',
              status: "confirmed",
              summary: "T",
              recurringEventId: "series-1",
              originalStartTime: { date: "2026-08-20" },
              start: { date: "2026-08-20" },
              end: { date: "2026-08-21" },
            },
          ],
        },
      ],
    });
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      originalStartAt: "2026-08-20T00:00:00.000Z",
      scheduleKind: "allDay",
    });

    expect(api.calls.instances.map((call) => call.originalStart)).toEqual([
      "2026-08-20",
      "2026-08-20T00:00:00Z",
    ]);
    expect(read?.kind).toBe("event");
    expect(read?.providerEventId).toBe("series-1_20260820");
    expect(api.calls.get).toHaveLength(0);
  });

  it("still returns the instance id when Google content fails the neutral contract", async () => {
    const api = new FakeEventsApi({
      instances: {
        kind: "calendar#events",
        items: [
          {
            kind: "calendar#event",
            id: "series-1_20260820",
            etag: '"v1"',
            status: "confirmed",
            summary: "T",
            recurringEventId: "series-1",
            originalStartTime: { date: "2026-08-20" },
            start: { date: "2026-08-20" },
            end: { date: "2026-08-21" },
            attendees: [
              { email: "guest@example.com", displayName: "x".repeat(300) },
            ],
          },
        ],
      },
    });
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      originalStartAt: "2026-08-20T00:00:00.000Z",
      scheduleKind: "allDay",
    });

    expect(read?.kind).toBe("event");
    expect(read?.providerEventId).toBe("series-1_20260820");
  });

  it("GETs the constructed Google instance id when the originalStart filter matches nothing", async () => {
    const constructedId = googleInstanceEventId(
      "series-1",
      "2026-08-20T00:00:00.000Z",
      "allDay",
    );
    const api = new FakeEventsApi({
      instances: { kind: "calendar#events", items: [] },
      get: {
        kind: "calendar#event",
        id: constructedId,
        etag: '"v1"',
        status: "confirmed",
        summary: "T",
        recurringEventId: "series-1",
        originalStartTime: { date: "2026-08-20" },
        start: { date: "2026-08-20" },
        end: { date: "2026-08-21" },
      },
    });
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      originalStartAt: "2026-08-20T00:00:00.000Z",
      scheduleKind: "allDay",
    });

    expect(constructedId).toBe("series-1_20260820");
    expect(api.calls.get[0]?.eventId).toBe(constructedId);
    expect(read?.providerEventId).toBe(constructedId);
  });

  it("does not treat the series master as the occurrence; GETs the constructed instance id instead", async () => {
    const constructedId = googleInstanceEventId(
      "series-1",
      "2026-08-20T00:00:00.000Z",
      "allDay",
    );
    const api = new FakeEventsApi({
      instances: {
        kind: "calendar#events",
        items: [
          {
            kind: "calendar#event",
            id: "series-1",
            etag: '"master"',
            status: "confirmed",
            summary: "Series",
            recurrence: ["RRULE:FREQ=DAILY"],
            start: { date: "2026-08-01" },
            end: { date: "2026-08-02" },
          },
        ],
      },
      get: {
        kind: "calendar#event",
        id: constructedId,
        etag: '"v1"',
        status: "confirmed",
        summary: "T",
        recurringEventId: "series-1",
        originalStartTime: { date: "2026-08-20" },
        start: { date: "2026-08-20" },
        end: { date: "2026-08-21" },
      },
    });
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      originalStartAt: "2026-08-20T00:00:00.000Z",
      scheduleKind: "allDay",
    });

    expect(read?.providerEventId).toBe(constructedId);
  });

  it("returns null (not an error) when the series itself is gone", async () => {
    const api = new FakeEventsApi({ instances: gError(404) });
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "gone",
      originalStartAt: "2025-01-15T09:00:00-05:00",
      scheduleKind: "timed",
    });

    expect(read).toBeNull();
  });

  it("resolves a cancelled instance as a cancellation read, not an event", async () => {
    const api = new FakeEventsApi({
      instances: {
        kind: "calendar#events",
        items: [
          {
            kind: "calendar#event",
            id: "series-1_instance",
            etag: '"v1"',
            status: "cancelled",
            recurringEventId: "series-1",
            originalStartTime: { dateTime: "2025-01-15T09:00:00-05:00" },
          },
        ],
      },
    });
    const { writer } = writerWith(api);

    const read = await writer.fetchInstanceAt({
      accessToken: "at",
      calendarId: "cal",
      seriesProviderEventId: "series-1",
      originalStartAt: "2025-01-15T09:00:00-05:00",
      scheduleKind: "timed",
    });

    expect(read?.kind).toBe("cancellation");
  });

  it("never leaks the bearer token onto a thrown error's cause", async () => {
    const api = new FakeEventsApi({ patch: gError(500) });
    const { writer } = writerWith(api);

    const error = (await writer
      .patchEvent(basePatch)
      .catch((e) => e)) as ProviderWriteError;

    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as { config?: unknown }).config).toBeUndefined();
    expect(JSON.stringify(error.cause ?? {})).not.toContain(
      "super-secret-token",
    );
  });

  it("rejects a create whose returned event lacks identity", async () => {
    const api = new FakeEventsApi({
      insert: { kind: "calendar#event", id: "x" } as gSchema$Event,
    });
    const { writer } = writerWith(api);

    const error = (await writer
      .createEvent(baseCreate)
      .catch((e) => e)) as ProviderWriteError;

    expect(error.reason).toBe("permanentProviderError");
  });
});

describe("deriveGoogleEventId", () => {
  it("lowercases a Compass ObjectId hex into a valid Google id", () => {
    expect(deriveGoogleEventId("ABC123DEADBEEF0000000000")).toBe(
      "abc123deadbeef0000000000",
    );
  });

  it("rejects an id outside the base32hex charset", () => {
    // 'z' is outside 0-9a-v.
    expect(() => deriveGoogleEventId("zzz")).toThrow();
    expect(() => deriveGoogleEventId("has-dashes-0000")).toThrow();
  });
});
