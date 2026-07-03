import { QueryClient } from "@tanstack/react-query";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import {
  findEventInCache,
  getEventQueryEntries,
  insertEventIntoQueries,
  patchEventInQueries,
  removeEventFromQueries,
  removeEventsByOriginFromQueries,
  reorderSomedayEventsInQueries,
  restoreEventQueries,
  snapshotEventQueries,
} from "./event.query.cache";
import { eventQueryKeys } from "./event.query.keys";
import { type SomedayEventQueryData } from "./event.query.types";

const event = (overrides: Partial<Schema_Event> = {}): Schema_Event => ({
  _id: "event-1",
  title: "Original",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  isSomeday: false,
  ...overrides,
});

const normalized = (...events: Schema_Event[]) => ({
  ids: events.map(({ _id }) => _id as string),
  entities: Object.fromEntries(events.map((item) => [item._id, item])),
});

const keys = {
  localWeek: eventQueryKeys.list({
    source: "local",
    scope: "week",
    params: {
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-07-08T00:00:00.000Z",
      someday: false,
    },
  }),
  remoteWeek: eventQueryKeys.list({
    source: "remote",
    scope: "week",
    params: {
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-07-08T00:00:00.000Z",
      someday: false,
    },
  }),
  someday: eventQueryKeys.list({
    source: "local",
    scope: "someday",
    params: {
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-08-01T00:00:00.000Z",
      someday: true,
    },
  }),
};

describe("event query cache", () => {
  test("enumerates Event entries and finds by source", () => {
    const client = new QueryClient();
    client.setQueryData(keys.localWeek, normalized(event()));
    client.setQueryData(
      keys.remoteWeek,
      normalized(event({ title: "Remote" })),
    );
    client.setQueryData(["tasks"], { ids: ["task-1"] });

    expect(getEventQueryEntries(client)).toHaveLength(2);
    expect(findEventInCache(client, "event-1", "remote")?.title).toBe("Remote");
  });

  test("inserts only into entries accepted by membership", () => {
    const client = new QueryClient();
    client.setQueryData(keys.localWeek, normalized(event()));
    client.setQueryData(keys.remoteWeek, normalized(event()));
    const created = event({ _id: "event-2", title: "Created" });

    insertEventIntoQueries(
      client,
      created,
      ({ metadata }) => metadata.source === "local",
    );

    expect(client.getQueryData<typeof normalized>(keys.localWeek)).toEqual(
      normalized(event(), created),
    );
    expect(
      client.getQueryData<ReturnType<typeof normalized>>(keys.remoteWeek)?.ids,
    ).toEqual(["event-1"]);
  });

  test("patches and removes every cached copy immutably", () => {
    const client = new QueryClient();
    const initial = normalized(event());
    client.setQueryData(keys.localWeek, initial);
    client.setQueryData(keys.someday, {
      ...initial,
      pagination: { data: [], page: 1, pageSize: 10, count: 1, offset: 0 },
    });

    patchEventInQueries(client, "event-1", { title: "Patched" });
    expect(initial.entities["event-1"].title).toBe("Original");
    expect(findEventInCache(client, "event-1")?.title).toBe("Patched");
    removeEventFromQueries(client, "event-1");

    expect(
      client.getQueryData<ReturnType<typeof normalized>>(keys.localWeek),
    ).toEqual({ ids: [], entities: {} });
    const someday = client.getQueryData<SomedayEventQueryData>(keys.someday);
    expect(someday?.pagination).toEqual({
      data: [],
      page: 1,
      pageSize: 10,
      count: 1,
      offset: 0,
    });
  });

  test("removes matching origins without touching other events", () => {
    const client = new QueryClient();
    const compass = event();
    const google = event({ _id: "google", origin: Origin.GOOGLE });
    client.setQueryData(keys.localWeek, normalized(compass, google));

    removeEventsByOriginFromQueries(client, [Origin.GOOGLE]);

    expect(
      client.getQueryData<ReturnType<typeof normalized>>(keys.localWeek),
    ).toEqual(normalized(compass));
  });

  test("reorders each Someday entry and preserves pagination", () => {
    const client = new QueryClient();
    const first = event({ _id: "first", isSomeday: true, order: 0 });
    const second = event({ _id: "second", isSomeday: true, order: 1 });
    const pagination = {
      data: [first, second],
      page: 1,
      pageSize: 10,
      count: 2,
      offset: 0,
    };
    client.setQueryData(keys.someday, {
      ...normalized(first, second),
      pagination,
    });

    reorderSomedayEventsInQueries(client, [
      { _id: "first", order: 1 },
      { _id: "second", order: 0 },
    ]);

    const result = client.getQueryData<SomedayEventQueryData>(keys.someday);
    expect(result?.ids).toEqual(["second", "first"]);
    expect(result?.entities.first.order).toBe(1);
    expect(result?.pagination).toBe(pagination);
  });

  test("restores exact snapshots after optimistic changes", () => {
    const client = new QueryClient();
    const local = normalized(event());
    const remote = normalized(event({ title: "Remote" }));
    client.setQueryData(keys.localWeek, local);
    client.setQueryData(keys.remoteWeek, remote);
    const snapshots = snapshotEventQueries(client);

    patchEventInQueries(client, "event-1", { title: "Changed" });
    restoreEventQueries(client, snapshots);

    expect(client.getQueryData(keys.localWeek)).toEqual(local);
    expect(client.getQueryData(keys.remoteWeek)).toEqual(remote);
  });
});
