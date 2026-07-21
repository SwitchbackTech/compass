import { type EventSchedule } from "@core/types/event.contracts";
import { type gSchema$Event } from "@core/types/gcal";
import { type SyncEventContent } from "@core/types/sync/event.contracts";
import {
  deriveGoogleEventId,
  type GoogleEventsApi,
  GoogleEventWriter,
} from "@sync/providers/google/google-event-writer.adapter";
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

type Behavior = gSchema$Event | Error | undefined;

// A scriptable fake for the four Google event calls. Each method records its
// params and either returns its scripted result or throws its scripted error.
class FakeEventsApi implements GoogleEventsApi {
  calls = {
    insert: [] as Parameters<GoogleEventsApi["insert"]>[0][],
    patch: [] as Parameters<GoogleEventsApi["patch"]>[0][],
    delete: [] as Parameters<GoogleEventsApi["delete"]>[0][],
    get: [] as Parameters<GoogleEventsApi["get"]>[0][],
  };

  constructor(
    private readonly behavior: {
      insert?: Behavior;
      patch?: Behavior;
      delete?: Behavior;
      get?: Behavior;
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

  it("treats a duplicate-id create as success by reading the event back", async () => {
    // 409 => a prior attempt already created it; the retry must not fail.
    const api = new FakeEventsApi({ insert: gError(409, "duplicate") });
    const { writer } = writerWith(api);

    const result = await writer.createEvent(baseCreate);

    expect(api.calls.get[0].eventId).toBe("abc12deadbeef00000000000");
    expect(result.providerVersion).toBe('"vGet"');
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
