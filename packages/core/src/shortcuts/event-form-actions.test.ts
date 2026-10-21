import { listEventFormActions } from "@core/shortcuts/event-form-actions";
import { describe, expect, it } from "bun:test";

describe("listEventFormActions", () => {
  it("includes copy meeting link only when a link exists", () => {
    const without = listEventFormActions({
      hasMeetingLink: false,
      isExistingEvent: true,
      isReadOnly: false,
      showBookingFormActions: false,
    }).map((row) => row.id);

    expect(without).not.toContain("edit-copy-meeting-link");

    const withLink = listEventFormActions({
      hasMeetingLink: true,
      isExistingEvent: true,
      isReadOnly: false,
      showBookingFormActions: false,
    }).map((row) => row.id);

    expect(withLink).toContain("edit-copy-meeting-link");
  });

  it("omits duplicate and delete on read-only drafts", () => {
    const ids = listEventFormActions({
      hasMeetingLink: false,
      isExistingEvent: true,
      isReadOnly: true,
      showBookingFormActions: false,
    }).map((row) => row.id);

    expect(ids).not.toContain("edit-duplicate");
    expect(ids).not.toContain("edit-delete");
  });
});
