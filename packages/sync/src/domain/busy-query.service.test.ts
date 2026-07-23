import { mergeBusyIntervals } from "@sync/domain/busy-query.service";

const iv = (start: string, end: string) => ({
  start: new Date(start),
  end: new Date(end),
});
// Compare merged output as ISO pairs for readable assertions.
const iso = (intervals: { start: Date; end: Date }[]) =>
  intervals.map((i) => [i.start.toISOString(), i.end.toISOString()]);

describe("mergeBusyIntervals", () => {
  it("returns nothing for no intervals", () => {
    expect(mergeBusyIntervals([])).toEqual([]);
  });

  it("passes a single interval through", () => {
    expect(
      iso(mergeBusyIntervals([iv("2026-07-14T09:00Z", "2026-07-14T10:00Z")])),
    ).toEqual([["2026-07-14T09:00:00.000Z", "2026-07-14T10:00:00.000Z"]]);
  });

  it("keeps disjoint intervals separate and sorted", () => {
    const out = mergeBusyIntervals([
      iv("2026-07-14T13:00Z", "2026-07-14T14:00Z"),
      iv("2026-07-14T09:00Z", "2026-07-14T10:00Z"),
    ]);
    expect(iso(out)).toEqual([
      ["2026-07-14T09:00:00.000Z", "2026-07-14T10:00:00.000Z"],
      ["2026-07-14T13:00:00.000Z", "2026-07-14T14:00:00.000Z"],
    ]);
  });

  it("merges overlapping intervals", () => {
    const out = mergeBusyIntervals([
      iv("2026-07-14T09:00Z", "2026-07-14T10:30Z"),
      iv("2026-07-14T10:00Z", "2026-07-14T11:00Z"),
    ]);
    expect(iso(out)).toEqual([
      ["2026-07-14T09:00:00.000Z", "2026-07-14T11:00:00.000Z"],
    ]);
  });

  it("merges touching intervals, leaving no free gap between them", () => {
    const out = mergeBusyIntervals([
      iv("2026-07-14T09:00Z", "2026-07-14T10:00Z"),
      iv("2026-07-14T10:00Z", "2026-07-14T11:00Z"),
    ]);
    expect(iso(out)).toEqual([
      ["2026-07-14T09:00:00.000Z", "2026-07-14T11:00:00.000Z"],
    ]);
  });

  it("absorbs a fully nested interval", () => {
    const out = mergeBusyIntervals([
      iv("2026-07-14T09:00Z", "2026-07-14T12:00Z"),
      iv("2026-07-14T10:00Z", "2026-07-14T10:30Z"),
    ]);
    expect(iso(out)).toEqual([
      ["2026-07-14T09:00:00.000Z", "2026-07-14T12:00:00.000Z"],
    ]);
  });

  it("is independent of input order", () => {
    const forward = mergeBusyIntervals([
      iv("2026-07-14T09:00Z", "2026-07-14T10:00Z"),
      iv("2026-07-14T09:30Z", "2026-07-14T11:00Z"),
      iv("2026-07-14T13:00Z", "2026-07-14T14:00Z"),
    ]);
    const shuffled = mergeBusyIntervals([
      iv("2026-07-14T13:00Z", "2026-07-14T14:00Z"),
      iv("2026-07-14T09:30Z", "2026-07-14T11:00Z"),
      iv("2026-07-14T09:00Z", "2026-07-14T10:00Z"),
    ]);
    expect(iso(forward)).toEqual(iso(shuffled));
    expect(iso(forward)).toEqual([
      ["2026-07-14T09:00:00.000Z", "2026-07-14T11:00:00.000Z"],
      ["2026-07-14T13:00:00.000Z", "2026-07-14T14:00:00.000Z"],
    ]);
  });

  it("drops empty (zero-length) intervals", () => {
    const out = mergeBusyIntervals([
      iv("2026-07-14T09:00Z", "2026-07-14T09:00Z"),
      iv("2026-07-14T10:00Z", "2026-07-14T11:00Z"),
    ]);
    expect(iso(out)).toEqual([
      ["2026-07-14T10:00:00.000Z", "2026-07-14T11:00:00.000Z"],
    ]);
  });
});
