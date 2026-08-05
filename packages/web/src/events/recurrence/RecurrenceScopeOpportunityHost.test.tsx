import { HotkeyManager } from "@tanstack/react-hotkeys";
import { type EventId } from "@core/types/domain-primitives";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { recurrenceScopeOpportunityActions } from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { RecurrenceScopeOpportunityHost } from "./RecurrenceScopeOpportunityHost";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("RecurrenceScopeOpportunityHost", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
    recurrenceScopeOpportunityActions.reset();
  });

  afterEach(() => {
    cleanup();
    recurrenceScopeOpportunityActions.reset();
  });

  it("promotes the live opportunity with 2", async () => {
    const id = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original: createMockEvent({
        recurrence: {
          kind: "occurrence",
          seriesId: "0123456789abcdef11111111" as EventId,
        },
      }),
      source: "local",
    });
    const requestPromotion = spyOn(
      recurrenceScopeOpportunityActions,
      "requestPromotion",
    );

    render(<RecurrenceScopeOpportunityHost />);
    fireEvent.keyDown(document, { key: "2" });

    await waitFor(() => {
      expect(requestPromotion).toHaveBeenCalledWith(id, "all");
    });
    requestPromotion.mockRestore();
  });
});
