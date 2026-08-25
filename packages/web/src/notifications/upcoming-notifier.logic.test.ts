import dayjs from "@core/util/date/dayjs";
import { createTestNotificationPort } from "@web/__tests__/helpers/web-test-seams";
import {
  announceUpcomingEvents,
  NOTIFY_LEAD_MINUTES,
  type NotifiableEvent,
  notificationKey,
  pruneFiredKeys,
  selectEventsToNotify,
} from "@web/notifications/upcoming-notifier.logic";
import { inEffectiveTimeZone } from "@web/timezone/in-time-zone";
import { describe, expect, it } from "bun:test";

const NOW = dayjs("2026-03-10T09:00:00.000Z");

const eventAt = (minutesFromNow: number, id = `e${minutesFromNow}`) =>
  ({
    _id: id,
    title: `Event ${id}`,
    startDate: NOW.add(minutesFromNow, "minute").toISOString(),
  }) satisfies NotifiableEvent;

describe("selectEventsToNotify", () => {
  it("includes events inside the lead window, at both edges", () => {
    const events = [eventAt(0), eventAt(NOTIFY_LEAD_MINUTES)];

    const due = selectEventsToNotify(NOW, events, new Set());

    expect(due.map((event) => event._id)).toEqual(["e0", "e5"]);
  });

  it("excludes events beyond the lead window", () => {
    const due = selectEventsToNotify(
      NOW,
      [eventAt(NOTIFY_LEAD_MINUTES + 1)],
      new Set(),
    );

    expect(due).toEqual([]);
  });

  it("never fires for an event that already started", () => {
    // The catch-up tick after a laptop wakes would otherwise dump a burst of
    // notifications for meetings that began hours ago.
    const due = selectEventsToNotify(
      NOW,
      [eventAt(-1), eventAt(-120)],
      new Set(),
    );

    expect(due).toEqual([]);
  });

  it("skips events already announced", () => {
    const event = eventAt(3);

    const due = selectEventsToNotify(
      NOW,
      [event],
      new Set([notificationKey(event)]),
    );

    expect(due).toEqual([]);
  });

  it("re-announces an event that moved to a new start time", () => {
    const original = eventAt(3, "same-id");
    const moved = {
      ...original,
      startDate: NOW.add(4, "minute").toISOString(),
    };

    const due = selectEventsToNotify(
      NOW,
      [moved],
      new Set([notificationKey(original)]),
    );

    expect(due).toEqual([moved]);
  });

  it("returns the soonest event first", () => {
    const due = selectEventsToNotify(NOW, [eventAt(4), eventAt(1)], new Set());

    expect(due.map((event) => event._id)).toEqual(["e1", "e4"]);
  });
});

describe("announceUpcomingEvents", () => {
  const seam = () => {
    const { port, mocks } = createTestNotificationPort({
      permission: "granted",
    });
    return { port, show: mocks.show };
  };

  it("shows the event title and its start time", () => {
    const { port, show } = seam();

    announceUpcomingEvents(port, NOW, [eventAt(3, "standup")], new Set());

    expect(show).toHaveBeenCalledTimes(1);
    const [title, options] = show.mock.calls[0] as [
      string,
      { body: string; tag: string },
    ];
    expect(title).toBe("Event standup");
    expect(options.body).toBe(
      `Starts at ${inEffectiveTimeZone(NOW.add(3, "minute")).format("h:mm A")}`,
    );
  });

  it("tags each notification with its de-dupe key so reloads replace, not stack", () => {
    const { port, show } = seam();
    const event = eventAt(3);

    announceUpcomingEvents(port, NOW, [event], new Set());

    const [, options] = show.mock.calls[0] as [string, { tag: string }];
    expect(options.tag).toBe(notificationKey(event));
  });

  it("falls back to a placeholder when the event has no title", () => {
    const { port, show } = seam();

    announceUpcomingEvents(
      port,
      NOW,
      [{ ...eventAt(2), title: "   " }],
      new Set(),
    );

    expect(show.mock.calls[0]?.[0]).toBe("Untitled event");
  });

  it("announces an event once, however often the tick re-runs", () => {
    const { port, show } = seam();
    const events = [eventAt(3)];

    let fired = announceUpcomingEvents(port, NOW, events, new Set());
    fired = announceUpcomingEvents(port, NOW, events, fired);
    announceUpcomingEvents(port, NOW.add(1, "minute"), events, fired);

    expect(show).toHaveBeenCalledTimes(1);
  });

  it("stays silent, and preserves the fired keys, when nothing is due", () => {
    const { port, show } = seam();
    const existing = new Set([notificationKey(eventAt(1, "already"))]);

    const fired = announceUpcomingEvents(port, NOW, [eventAt(90)], existing);

    expect(show).not.toHaveBeenCalled();
    expect([...fired]).toEqual([...existing]);
  });
});

describe("pruneFiredKeys", () => {
  it("keeps recent keys and drops ones older than a day", () => {
    const recent = notificationKey(eventAt(-60, "recent"));
    const stale = notificationKey({
      _id: "stale",
      startDate: NOW.subtract(25, "hour").toISOString(),
    });

    const pruned = pruneFiredKeys(new Set([recent, stale]), NOW);

    expect([...pruned]).toEqual([recent]);
  });

  it("drops keys that carry no parseable start time", () => {
    const pruned = pruneFiredKeys(new Set(["broken-key-without-date"]), NOW);

    expect([...pruned]).toEqual([]);
  });
});
