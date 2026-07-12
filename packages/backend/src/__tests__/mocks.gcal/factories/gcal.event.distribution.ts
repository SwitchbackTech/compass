import { RRule } from "rrule";
import { type gSchema$Event } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";

/**
 * Production-shaped Google event distribution for import-benchmark scenarios
 * (packet 09 step 5). Deterministic by construction - index arithmetic only,
 * never Math.random - so a benchmark run's imported-count assertion and
 * timing are reproducible across machines and re-runs.
 *
 * Mix per 100 events, roughly:
 *  - 60 single timed events (15m-3h durations, spread across +/-60 days)
 *  - 15 all-day events (1-3 day spans)
 *  - 20 recurring, expanded from 4 base series (weekly/daily RRULEs)
 *  - 5 cancelled events
 */

const { RFC3339_OFFSET, YEAR_MONTH_DAY_FORMAT } = dayjs.DateFormat;
const ANCHOR = new Date("2026-06-15T09:00:00.000Z");
const ZONES = ["America/New_York", "America/Denver", "Europe/London", "UTC"];
const WORDS = [
  "Sync",
  "Planning",
  "1:1",
  "Standup",
  "Design Review",
  "Retro",
  "Interview",
  "Demo",
  "Deep Work",
  "Budget Review",
  "Onboarding",
  "Launch Prep",
  "Postmortem",
  "Roadmap",
  "Customer Call",
];

const title = (i: number): string =>
  `${WORDS[i % WORDS.length]} - ${WORDS[(i * 7 + 3) % WORDS.length]}`;

const description = (i: number): string =>
  Array<string>(1 + (i % 3))
    .fill("Agenda and notes carry over from the previous occurrence.")
    .join(" ");

const timedRange = (
  dayOffset: number,
  hour: number,
  minute: number,
  durationMin: number,
  tz: string,
) => {
  const start = dayjs
    .tz(ANCHOR, tz)
    .add(dayOffset, "day")
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0);
  const end = start.add(durationMin, "minute");
  return {
    start: { dateTime: start.format(RFC3339_OFFSET), timeZone: tz },
    end: { dateTime: end.format(RFC3339_OFFSET), timeZone: tz },
  };
};

const allDayRange = (dayOffset: number, spanDays: number) => {
  const start = dayjs.tz(ANCHOR, "UTC").add(dayOffset, "day").startOf("day");
  const end = start.add(spanDays, "day");
  return {
    start: { date: start.format(YEAR_MONTH_DAY_FORMAT) },
    end: { date: end.format(YEAR_MONTH_DAY_FORMAT) },
  };
};

export interface ProductionShapedEvents {
  events: gSchema$Event[];
  /** Compass EventRecords a full import of `events` saves for one calendar. */
  expectedImportedCount: number;
}

/**
 * Generates a deterministic, production-shaped batch of raw Google Calendar
 * events for import-benchmark scenarios. `seedOffset` shifts ids/dates so
 * two calls produce disjoint event sets.
 */
export const generateProductionShapedEvents = (
  count: number,
  seedOffset = 0,
): ProductionShapedEvents => {
  const singleCount = Math.round(count * 0.6);
  const allDayCount = Math.round(count * 0.15);
  const cancelledCount = Math.round(count * 0.05);
  const seriesCount = 4;
  const recurringBudget = Math.max(
    0,
    count - singleCount - allDayCount - cancelledCount,
  );
  // -1 per series: the base event's own slot already counts toward the
  // series' share, so instances fill the remainder.
  const instancesPerSeries = Math.max(
    2,
    Math.floor(recurringBudget / seriesCount) - 1,
  );

  const events: gSchema$Event[] = [];

  for (let i = 0; i < singleCount; i++) {
    const tz = ZONES[i % ZONES.length]!;
    events.push(
      mockRegularGcalEvent({
        id: `single-${seedOffset}-${i}`,
        summary: title(i),
        description: description(i),
        ...timedRange(
          ((i + seedOffset) % 121) - 60,
          8 + (i % 10),
          (i % 4) * 15,
          15 + (i % 12) * 15,
          tz,
        ),
      }),
    );
  }

  for (let i = 0; i < allDayCount; i++) {
    events.push(
      mockRegularGcalEvent(
        {
          id: `allday-${seedOffset}-${i}`,
          summary: title(i + 1000),
          description: description(i),
          ...allDayRange(((i + seedOffset) % 121) - 60, 1 + (i % 3)),
        },
        true,
      ),
    );
  }

  for (let i = 0; i < cancelledCount; i++) {
    events.push(
      mockRegularGcalEvent({
        id: `cancelled-${seedOffset}-${i}`,
        status: "cancelled",
        summary: title(i + 2000),
        ...timedRange(((i + seedOffset) % 121) - 60, 9, 0, 30, "UTC"),
      }),
    );
  }

  const seriesFreqs = [RRule.DAILY, RRule.WEEKLY, RRule.DAILY, RRule.WEEKLY];
  for (let s = 0; s < seriesCount; s++) {
    const tz = ZONES[s % ZONES.length]!;
    const base = mockRecurringGcalBaseEvent(
      {
        id: `series-${seedOffset}-${s}`,
        summary: `${title(s + 3000)} (recurring)`,
        description: description(s),
        ...timedRange(-30 + s * 5 + seedOffset, 9, 0, 30, tz),
      },
      false,
      {
        freq: seriesFreqs[s],
        interval: s % 2 === 0 ? 1 : 2,
        count: instancesPerSeries,
      },
    );

    events.push(base, ...mockRecurringGcalInstances(base));
  }

  const recurringDocs = seriesCount * (1 + instancesPerSeries);
  const expectedImportedCount = singleCount + allDayCount + recurringDocs;

  return { events, expectedImportedCount };
};
