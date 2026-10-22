import { listEventFormActions } from "@core/shortcuts/event-form-actions";
import { describe, expect, it } from "bun:test";

describe("listEventFormActions", () => {
  it("includes copy meeting link only when a link exists", () => {
    const without = listEventFormActions({
      hasMeetingLink: false,
      isExistingEvent: true,
      isReadOnly: false,
      isScheduleLocked: false,
      showBookingFormActions: false,
    }).map((row) => row.id);

    expect(without).not.toContain("edit-copy-meeting-link");

    const withLink = listEventFormActions({
      hasMeetingLink: true,
      isExistingEvent: true,
      isReadOnly: false,
      isScheduleLocked: false,
      showBookingFormActions: false,
    }).map((row) => row.id);

    expect(withLink).toContain("edit-copy-meeting-link");
  });

  it("omits duplicate and delete on read-only drafts", () => {
    const ids = listEventFormActions({
      hasMeetingLink: false,
      isExistingEvent: true,
      isReadOnly: true,
      isScheduleLocked: false,
      showBookingFormActions: false,
    }).map((row) => row.id);

    expect(ids).not.toContain("edit-duplicate");
    expect(ids).not.toContain("edit-delete");
  });

  it("omits toggle all day when schedule is locked", () => {
    const ids = listEventFormActions({
      hasMeetingLink: false,
      isExistingEvent: false,
      isReadOnly: false,
      isScheduleLocked: true,
      showBookingFormActions: false,
    }).map((row) => row.id);

    expect(ids).not.toContain("edit-toggle-all-day");
  });

  it("lists only palette-invocable actions", () => {
    const ids = listEventFormActions({
      hasMeetingLink: true,
      isExistingEvent: true,
      isReadOnly: false,
      isScheduleLocked: false,
      showBookingFormActions: true,
    }).map((row) => row.id);

    expect(ids).not.toContain("edit-jump-field-digit");
  });
});
