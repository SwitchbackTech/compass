import { reprojectOccurrencesBatch } from "@sync/domain/reproject";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { describe, expect, it } from "bun:test";

const now = () => new Date("2026-07-10T00:00:00.000Z");

// Records the shape of every transaction reprojectOccurrencesBatch would open,
// which is the thing under test — the batching, not the writes.
function recordingOccurrences() {
  const transactions: number[][] = [];
  const repo = {
    replaceForEvents: async (
      entries: readonly { occurrences: unknown[] }[],
    ) => {
      transactions.push(entries.map((entry) => entry.occurrences.length));
    },
  } as unknown as EventOccurrenceRepository;
  return { repo, transactions };
}

const event = (id: string, recurring: boolean): EventRecord =>
  ({
    _id: id,
    generation: 0,
    tenantId: "t",
    principalId: "p",
    calendarId: "c",
    connectionId: "conn",
    providerEventId: id,
    content: {
      title: id,
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    },
    busy: true,
    cancelled: false,
    // A daily rule expands to one occurrence per day across the sync horizon,
    // so a handful of these events is worth thousands of documents.
    recurrence: recurring
      ? { kind: "seriesMaster", rules: ["RRULE:FREQ=DAILY"] }
      : { kind: "single" },
    schedule: {
      kind: "timed",
      start: "2026-07-10T15:00:00.000Z",
      end: "2026-07-10T16:00:00.000Z",
      timeZone: "UTC",
    },
  }) as unknown as EventRecord;

const total = (transaction: number[]) =>
  transaction.reduce((sum, n) => sum + n, 0);

describe("reprojectOccurrencesBatch", () => {
  it("writes an ordinary batch as a single transaction", async () => {
    const { repo, transactions } = recordingOccurrences();

    await reprojectOccurrencesBatch(
      repo,
      Array.from({ length: 50 }, (_, i) => ({ event: event(`e${i}`, false) })),
      now,
    );

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toHaveLength(50);
  });

  // The caller batches by EVENT count, which does not bound the write: on Atlas
  // a batch of recurring events overran the WiredTiger cache ("transaction is
  // too large", code 388) and wedged a production import for five days.
  it("splits a batch so no transaction exceeds the occurrence cap", async () => {
    const { repo, transactions } = recordingOccurrences();

    await reprojectOccurrencesBatch(
      repo,
      Array.from({ length: 20 }, (_, i) => ({ event: event(`r${i}`, true) })),
      now,
    );

    expect(transactions.length).toBeGreaterThan(1);
    for (const transaction of transactions) {
      expect(total(transaction)).toBeLessThanOrEqual(2_000);
    }
  });

  it("projects every entry exactly once across the split", async () => {
    const { repo, transactions } = recordingOccurrences();
    const entries = Array.from({ length: 20 }, (_, i) => ({
      event: event(`r${i}`, true),
    }));

    await reprojectOccurrencesBatch(repo, entries, now);

    expect(transactions.flat()).toHaveLength(entries.length);
  });

  // An entry is never split across transactions: replaceForEvents deletes and
  // re-inserts per (eventId, generation), so that pair has to stay atomic even
  // when one event's own expansion is larger than the cap.
  it("keeps an oversized single entry in one transaction, alone", async () => {
    const { repo, transactions } = recordingOccurrences();

    await reprojectOccurrencesBatch(
      repo,
      [
        { event: event("small", false) },
        { event: event("huge", true) },
        { event: event("after", false) },
      ],
      now,
    );

    const huge = transactions.find((t) => t.some((n) => n > 2_000));
    if (huge) expect(huge).toHaveLength(1);
    expect(transactions.flat()).toHaveLength(3);
  });

  it("does nothing for an empty batch", async () => {
    const { repo, transactions } = recordingOccurrences();
    await reprojectOccurrencesBatch(repo, [], now);
    expect(transactions).toHaveLength(0);
  });
});
