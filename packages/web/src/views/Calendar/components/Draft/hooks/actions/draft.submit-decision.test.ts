import { getDraftSubmitAction } from "./draft.submit-decision";
import { describe, expect, it } from "bun:test";

describe("getDraftSubmitAction", () => {
  it("creates a new event when the draft has no id", () => {
    expect(
      getDraftSubmitAction({
        draft: { title: "New" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: false,
        isDirty: false,
      }),
    ).toBe("CREATE");
  });

  it("discards a pending event update", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "pending-id", title: "Pending" },
        pendingEventIds: ["pending-id"],
        isFormOpenBeforeDragging: false,
        isDirty: true,
      }),
    ).toBe("DISCARD");
  });

  it("opens the form again after a drag that started from an open form", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "event-id", title: "Existing" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: true,
        isDirty: true,
      }),
    ).toBe("OPEN_FORM");
  });

  it("discards unchanged existing events", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "event-id", title: "Existing" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: false,
        isDirty: false,
      }),
    ).toBe("DISCARD");
  });

  it("updates changed existing events", () => {
    expect(
      getDraftSubmitAction({
        draft: { _id: "event-id", title: "Existing" },
        pendingEventIds: [],
        isFormOpenBeforeDragging: false,
        isDirty: true,
      }),
    ).toBe("UPDATE");
  });
});
