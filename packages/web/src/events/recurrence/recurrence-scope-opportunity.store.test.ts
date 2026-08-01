import { type EventId } from "@core/types/domain-primitives";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
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
    recurrenceScopeOpportunityActions.clear();
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
    recurrenceScopeOpportunityActions.clear();
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
});
