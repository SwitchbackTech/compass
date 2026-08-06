import { type EventId } from "@core/types/domain-primitives";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  isRecurrenceScopeEditAskDeclined,
  recurrenceScopeOpportunityActions,
  useRecurrenceScopeOpportunityStore,
} from "./recurrence-scope-opportunity.store";
import { describe, expect, it } from "bun:test";

const original = createMockEvent({
  recurrence: {
    kind: "occurrence",
    seriesId: "0123456789abcdef11111111" as EventId,
  },
});

describe("recurrenceScopeOpportunityActions", () => {
  it("only promotes the currently-live opportunity once", () => {
    recurrenceScopeOpportunityActions.reset();
    const id = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original,
      source: "local",
    });

    recurrenceScopeOpportunityActions.requestPromotion(id, "all");
    const claimed = recurrenceScopeOpportunityActions.claimPromotion();

    expect(claimed).toMatchObject({
      id,
      kind: "delete",
      requestedScope: "all",
      status: "requested",
    });
    expect(recurrenceScopeOpportunityActions.claimPromotion()).toBeNull();
    expect(
      useRecurrenceScopeOpportunityStore.getState().opportunity,
    ).toMatchObject({
      id,
      status: "submitting",
    });
  });

  it("new opportunities supersede an older toast without letting it promote", () => {
    recurrenceScopeOpportunityActions.reset();
    const older = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original,
      source: "local",
    });
    const newer = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original,
      source: "local",
    });

    recurrenceScopeOpportunityActions.requestPromotion(older, "all");

    expect(
      useRecurrenceScopeOpportunityStore.getState().opportunity,
    ).toMatchObject({
      id: newer,
      status: "ready",
    });
  });

  it("records a decline when an edit ask expires", () => {
    recurrenceScopeOpportunityActions.reset();
    const id = recurrenceScopeOpportunityActions.begin({
      kind: "replace",
      original,
      input: {
        calendarId: original.calendarId,
        content: {
          kind: "details" as const,
          title: "Test",
          description: "",
          location: "",
        },
        schedule: original.schedule,
        recurrence: { kind: "preserve" },
        scope: "this",
      },
      source: "local",
    });

    recurrenceScopeOpportunityActions.dismiss(id);

    expect(isRecurrenceScopeEditAskDeclined(original.id)).toBe(true);
    expect(
      useRecurrenceScopeOpportunityStore.getState().opportunity,
    ).toBeNull();
  });

  it("records a decline when a newer ask supersedes a live edit ask", () => {
    recurrenceScopeOpportunityActions.reset();
    const id1 = recurrenceScopeOpportunityActions.begin({
      kind: "replace",
      original,
      input: {
        calendarId: original.calendarId,
        content: {
          kind: "details" as const,
          title: "Test",
          description: "",
          location: "",
        },
        schedule: original.schedule,
        recurrence: { kind: "preserve" },
        scope: "this",
      },
      source: "local",
    });
    const id2 = recurrenceScopeOpportunityActions.begin({
      kind: "replace",
      original,
      input: {
        calendarId: original.calendarId,
        content: {
          kind: "details" as const,
          title: "Test",
          description: "",
          location: "",
        },
        schedule: original.schedule,
        recurrence: { kind: "preserve" },
        scope: "this",
      },
      source: "local",
    });

    expect(isRecurrenceScopeEditAskDeclined(original.id)).toBe(true);
    expect(useRecurrenceScopeOpportunityStore.getState().opportunity?.id).toBe(
      id2,
    );
    expect(
      useRecurrenceScopeOpportunityStore.getState().opportunity?.status,
    ).toBe("ready");
  });

  it("does not record a decline for a delete ask", () => {
    recurrenceScopeOpportunityActions.reset();
    const id = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original,
      source: "local",
    });

    recurrenceScopeOpportunityActions.dismiss(id);

    expect(isRecurrenceScopeEditAskDeclined(original.id)).toBe(false);
  });

  it("clear() leaves the ask undeclined", () => {
    recurrenceScopeOpportunityActions.reset();
    const id = recurrenceScopeOpportunityActions.begin({
      kind: "replace",
      original,
      input: {
        calendarId: original.calendarId,
        content: {
          kind: "details" as const,
          title: "Test",
          description: "",
          location: "",
        },
        schedule: original.schedule,
        recurrence: { kind: "preserve" },
        scope: "this",
      },
      source: "local",
    });

    recurrenceScopeOpportunityActions.clear();

    expect(isRecurrenceScopeEditAskDeclined(original.id)).toBe(false);
  });

  it("promotion drops an existing decline for the instance", () => {
    recurrenceScopeOpportunityActions.reset();
    const replaceId = recurrenceScopeOpportunityActions.begin({
      kind: "replace",
      original,
      input: {
        calendarId: original.calendarId,
        content: {
          kind: "details" as const,
          title: "Test",
          description: "",
          location: "",
        },
        schedule: original.schedule,
        recurrence: { kind: "preserve" },
        scope: "this",
      },
      source: "local",
    });
    recurrenceScopeOpportunityActions.dismiss(replaceId);
    expect(isRecurrenceScopeEditAskDeclined(original.id)).toBe(true);

    // Now promote a delete
    const deleteId = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original,
      source: "local",
    });
    recurrenceScopeOpportunityActions.requestPromotion(deleteId, "all");
    recurrenceScopeOpportunityActions.claimPromotion();

    expect(isRecurrenceScopeEditAskDeclined(original.id)).toBe(false);
  });

  it("reset() clears both the opportunity and the declined set", () => {
    recurrenceScopeOpportunityActions.reset();
    const id = recurrenceScopeOpportunityActions.begin({
      kind: "replace",
      original,
      input: {
        calendarId: original.calendarId,
        content: {
          kind: "details" as const,
          title: "Test",
          description: "",
          location: "",
        },
        schedule: original.schedule,
        recurrence: { kind: "preserve" },
        scope: "this",
      },
      source: "local",
    });
    recurrenceScopeOpportunityActions.dismiss(id);

    recurrenceScopeOpportunityActions.reset();

    expect(isRecurrenceScopeEditAskDeclined(original.id)).toBe(false);
    expect(
      useRecurrenceScopeOpportunityStore.getState().opportunity,
    ).toBeNull();
    expect(
      useRecurrenceScopeOpportunityStore.getState().declinedEditInstanceIds
        .size,
    ).toBe(0);
  });
});
