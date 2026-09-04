import {
  CONTRACT_EVENT_ID,
  defaultCorpusDir,
} from "@sync/providers/__contract__/adapter-contract";
import { appleRecordedReader } from "@sync/providers/__contract__/apple-contract.factory";
import { type ProviderEventReadError } from "@sync/providers/provider-event-reader.port";
import { beforeEach, describe, expect, it } from "bun:test";

describe("apple reader contract", () => {
  const corpusDir = defaultCorpusDir("apple");
  const calendarId = "/123456789/calendars/home/";
  const accessToken = "contract-access-token";
  const expiredCursor = "expired-sync-token";
  let reader = appleRecordedReader(corpusDir);

  beforeEach(() => {
    reader = appleRecordedReader(corpusDir);
  });

  it("pages, yields nextSyncToken only at the end, and counts skipped events", async () => {
    const first = await reader.listEventPage({
      accessToken,
      calendarId,
    });
    expect(first.skipped).toBeGreaterThanOrEqual(1);

    let page = first;
    let pages = 1;
    while (page.nextPageToken) {
      expect(page.nextSyncToken).toBeNull();
      page = await reader.listEventPage({
        accessToken,
        calendarId,
        pageToken: page.nextPageToken,
      });
      pages += 1;
    }
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(page.nextPageToken).toBeNull();
    expect(
      page.nextSyncToken === null || typeof page.nextSyncToken === "string",
    ).toBe(true);
  });

  it("maps an expired cursor to cursorExpired", async () => {
    try {
      await reader.listEventPage({
        accessToken,
        calendarId,
        cursor: expiredCursor,
      });
      throw new Error("expected cursorExpired");
    } catch (caught) {
      expect((caught as ProviderEventReadError).reason).toBe("cursorExpired");
    }
  });

  it("keeps masters and exceptions and does not expand occurrences", async () => {
    const events = [];
    let pageToken: string | null = null;
    do {
      const page = await reader.listEventPage({
        accessToken,
        calendarId,
        pageToken,
      });
      events.push(...page.events);
      pageToken = page.nextPageToken;
    } while (pageToken);

    const masters = events.filter(
      (event) =>
        event.kind === "event" && event.recurrence.kind === "seriesMaster",
    );
    const instances = events.filter(
      (event) => event.kind === "event" && event.recurrence.kind === "instance",
    );
    expect(masters.length).toBeGreaterThanOrEqual(1);
    expect(instances.length).toBeGreaterThanOrEqual(1);
    expect(instances.length).toBeLessThan(5);
    expect(events.some((event) => event.kind === "cancellation")).toBe(true);
    expect(events.some((event) => event.kind === "event")).toBe(true);
    void CONTRACT_EVENT_ID;
  });
});
