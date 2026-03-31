import { isGoogleCalendarImportActive } from "./user-metadata.import.util";

describe("isGoogleCalendarImportActive", () => {
  it("returns true when import is actively running", () => {
    expect(
      isGoogleCalendarImportActive({
        google: { connectionState: "HEALTHY" },
        sync: { importGCal: "IMPORTING" },
      }),
    ).toBe(true);
  });

  it("returns false for RESTART — import hasn't started yet, no spinner", () => {
    // RESTART means the backend wants to re-import, not that it's running.
    // Showing a spinner for RESTART caused visible flicker before this fix.
    expect(
      isGoogleCalendarImportActive({
        google: { connectionState: "ATTENTION" },
        sync: { importGCal: "RESTART" },
      }),
    ).toBe(false);
  });

  it("returns false when COMPLETED", () => {
    expect(
      isGoogleCalendarImportActive({
        google: { connectionState: "HEALTHY" },
        sync: { importGCal: "COMPLETED" },
      }),
    ).toBe(false);
  });

  it("returns false when ERRORED", () => {
    expect(
      isGoogleCalendarImportActive({
        google: { connectionState: "HEALTHY" },
        sync: { importGCal: "ERRORED" },
      }),
    ).toBe(false);
  });

  it("returns false when sync status is absent", () => {
    expect(
      isGoogleCalendarImportActive({ google: { connectionState: "HEALTHY" } }),
    ).toBe(false);
  });

  it("returns false when IMPORTING but Google is not connected", () => {
    expect(
      isGoogleCalendarImportActive({
        google: { connectionState: "NOT_CONNECTED" },
        sync: { importGCal: "IMPORTING" },
      }),
    ).toBe(false);
  });

  it("returns false when IMPORTING but reconnect is required", () => {
    expect(
      isGoogleCalendarImportActive({
        google: { connectionState: "RECONNECT_REQUIRED" },
        sync: { importGCal: "IMPORTING" },
      }),
    ).toBe(false);
  });
});
