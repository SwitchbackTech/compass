import { type EventSchedule } from "@core/types/event.contracts";
import { type TimeZone } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import { projectOccurrences } from "@sync/domain/occurrence-projection";
import {
  type GraphEvent,
  normalizeMicrosoftEvent,
} from "@sync/providers/microsoft/microsoft-event.normalizer";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";

const DENVER = "America/Denver" as TimeZone;

const unwindDailyMaster = (
  overrides: Partial<GraphEvent> = {},
): GraphEvent => ({
  id: "unwind-daily",
  "@odata.etag": 'W/"unwind-daily"',
  type: "seriesMaster",
  subject: "Unwind",
  start: {
    dateTime: "2025-10-20T01:00:00.0000000",
    timeZone: "UTC",
  },
  end: {
    dateTime: "2025-10-20T02:00:00.0000000",
    timeZone: "UTC",
  },
  recurrence: {
    pattern: { type: "daily", interval: 1 },
    range: { type: "noEnd", startDate: "2025-10-19" },
  },
  cancelledOccurrences: [
    "2025-10-21T01:00:00.0000000Z",
    "2025-10-23T01:00:00.0000000Z",
    "2025-10-24T01:00:00.0000000Z",
    "2025-10-28T01:00:00.0000000Z",
    "2025-10-30T01:00:00.0000000Z",
    "2025-10-31T01:00:00.0000000Z",
    "2025-11-04T02:00:00.0000000Z",
    "2025-11-06T02:00:00.0000000Z",
    "2025-11-07T02:00:00.0000000Z",
  ],
  ...overrides,
});

const unwindWeeklyMaster = (): GraphEvent => ({
  id: "unwind-weekly",
  "@odata.etag": 'W/"unwind-weekly"',
  type: "seriesMaster",
  subject: "Unwind",
  start: {
    dateTime: "2025-10-20T01:00:00.0000000",
    timeZone: "UTC",
  },
  end: {
    dateTime: "2025-10-20T02:00:00.0000000",
    timeZone: "UTC",
  },
  recurrence: {
    pattern: {
      type: "daily",
      interval: 1,
      daysOfWeek: ["sunday", "tuesday", "friday", "saturday"],
      firstDayOfWeek: "sunday",
    },
    range: { type: "noEnd", startDate: "2025-10-19" },
  },
});

const asSeriesMaster = (read: ReturnType<typeof normalizeMicrosoftEvent>) => {
  if (read.kind !== "event" || read.recurrence.kind !== "seriesMaster") {
    throw new Error("expected series master");
  }
  return read.recurrence;
};

const toEventRecord = (
  schedule: EventSchedule,
  rules: readonly string[],
): EventRecord =>
  ({
    _id: "event-id",
    calendarId: "cal-id",
    connectionId: "conn-id",
    providerEventId: "provider-id",
    version: 1,
    content: {
      title: "Unwind",
      description: "",
      location: "",
      organizer: null,
      attendees: [],
      conference: null,
    },
    schedule,
    recurrence: { kind: "seriesMaster", rules },
  }) as EventRecord;

const projectedUtcStarts = (
  event: EventRecord,
  horizonStart: string,
  horizonEnd: string,
) => {
  const horizon = {
    start: new Date(horizonStart),
    end: new Date(horizonEnd),
  };
  return projectOccurrences(event, horizon)
    .filter((occ) => occ.schedule.kind === "timed")
    .map(
      (occ) =>
        (occ.schedule as Extract<EventSchedule, { kind: "timed" }>).start,
    );
};

describe("normalizeMicrosoftEvent Microsoft recurring Unwind shapes", () => {
  it("shape A: daily master with cancelledOccurrences maps EXDATE and mailbox fallback tz", () => {
    const read = normalizeMicrosoftEvent(unwindDailyMaster(), undefined, {
      graphPreferTimeZone: "UTC",
      fallbackIanaTimeZone: DENVER,
    });
    const master = asSeriesMaster(read);

    expect(read.schedule.kind).toBe("timed");
    if (read.schedule.kind !== "timed") return;
    expect(read.schedule.timeZone).toBe(DENVER);
    expect(master.rules[0]).toContain("FREQ=DAILY");
    expect(master.rules.some((line) => line.startsWith("EXDATE:"))).toBe(true);
    expect(master.rules).toHaveLength(10);
  });

  it("shape A: projects Sun/Tue/Fri/Sat at 7 PM Denver with correct UTC instants across DST", () => {
    const read = normalizeMicrosoftEvent(unwindDailyMaster(), undefined, {
      graphPreferTimeZone: "UTC",
      fallbackIanaTimeZone: DENVER,
    });
    const event = toEventRecord(read.schedule, asSeriesMaster(read).rules);

    const beforeDstEnd = projectedUtcStarts(
      event,
      "2025-10-25T06:00:00.000Z",
      "2025-11-01T06:00:00.000Z",
    );
    expect(beforeDstEnd).toEqual([
      "2025-10-25T19:00:00-06:00",
      "2025-10-26T19:00:00-06:00",
      "2025-10-28T19:00:00-06:00",
      "2025-10-31T19:00:00-06:00",
    ]);

    const afterDstEnd = projectedUtcStarts(
      event,
      "2025-11-01T06:00:00.000Z",
      "2025-11-09T07:00:00.000Z",
    );
    expect(afterDstEnd).toEqual([
      "2025-11-01T19:00:00-06:00",
      "2025-11-02T19:00:00-07:00",
      "2025-11-04T19:00:00-07:00",
      "2025-11-07T19:00:00-07:00",
      "2025-11-08T19:00:00-07:00",
    ]);

    for (const iso of beforeDstEnd) {
      expect(dayjs(iso).utc().format("HH:mm")).toBe("01:00");
    }
    for (const iso of afterDstEnd.slice(1)) {
      expect(dayjs(iso).utc().format("HH:mm")).toBe("02:00");
    }
  });

  it("shape B: daily pattern with daysOfWeek normalizes to weekly BYDAY", () => {
    const read = normalizeMicrosoftEvent(unwindWeeklyMaster(), undefined, {
      graphPreferTimeZone: "UTC",
      fallbackIanaTimeZone: DENVER,
    });
    const master = asSeriesMaster(read);

    expect(read.schedule.timeZone).toBe(DENVER);
    expect(master.rules[0]).toContain("FREQ=WEEKLY");
    expect(master.rules[0]).toContain("BYDAY=SU,TU,FR,SA");
  });

  it("does not dedupe occurrences across two series with different ids", () => {
    const first = normalizeMicrosoftEvent(
      unwindDailyMaster({ id: "series-a" }),
      undefined,
      {
        graphPreferTimeZone: "UTC",
        fallbackIanaTimeZone: DENVER,
      },
    );
    const second = normalizeMicrosoftEvent(
      unwindDailyMaster({
        id: "series-b",
        iCalUId: "other-ical-uid",
      }),
      undefined,
      {
        graphPreferTimeZone: "UTC",
        fallbackIanaTimeZone: DENVER,
      },
    );
    const eventA = toEventRecord(first.schedule, asSeriesMaster(first).rules);
    const eventB = toEventRecord(second.schedule, asSeriesMaster(second).rules);
    const horizon = {
      start: new Date("2025-10-25T06:00:00.000Z"),
      end: new Date("2025-11-01T06:00:00.000Z"),
    };
    expect(projectOccurrences(eventA, horizon)).toHaveLength(4);
    expect(projectOccurrences(eventB, horizon)).toHaveLength(4);
    expect(
      projectOccurrences(eventA, horizon).every((occ, index) => {
        const b = projectOccurrences(eventB, horizon)[index];
        return (
          occ.schedule.kind === "timed" &&
          b?.schedule.kind === "timed" &&
          occ.schedule.start === b.schedule.start
        );
      }),
    ).toBe(true);
  });

  it("local wall clock stays 7 PM across the fall-back week", () => {
    const read = normalizeMicrosoftEvent(unwindDailyMaster(), undefined, {
      graphPreferTimeZone: "UTC",
      fallbackIanaTimeZone: DENVER,
    });
    const event = toEventRecord(read.schedule, asSeriesMaster(read).rules);
    const horizon = {
      start: new Date("2025-11-01T06:00:00.000Z"),
      end: new Date("2025-11-09T07:00:00.000Z"),
    };
    const localTimes = projectOccurrences(event, horizon)
      .filter((occ) => occ.schedule.kind === "timed")
      .map((occ) => {
        const start = (
          occ.schedule as Extract<EventSchedule, { kind: "timed" }>
        ).start;
        return dayjs(start).tz(DENVER).format("ddd h:mm A");
      });
    expect(localTimes).toEqual([
      "Sat 7:00 PM",
      "Sun 7:00 PM",
      "Tue 7:00 PM",
      "Fri 7:00 PM",
      "Sat 7:00 PM",
    ]);
  });
});
