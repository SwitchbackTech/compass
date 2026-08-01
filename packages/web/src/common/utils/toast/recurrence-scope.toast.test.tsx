import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { type EventId } from "@core/types/domain-primitives";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { EVENT_DELETED_TOAST_ID } from "@web/common/constants/toast.constants";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import {
  recurrenceScopeOpportunityActions,
  useRecurrenceScopeOpportunityStore,
} from "@web/events/recurrence/recurrence-scope-opportunity.store";
import {
  dismissRecurrenceScopeToast,
  showRecurrenceScopeToast,
} from "./recurrence-scope.toast";
import { beforeEach, describe, expect, it } from "bun:test";

describe("showRecurrenceScopeToast", () => {
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    recurrenceScopeOpportunityActions.clear();
    mocks.toast.mockClear();
    mocks.update.mockClear();
    mocks.dismiss.mockClear();
    registerToastPort(port);
  });

  it("offers accessible clickable promotion actions", async () => {
    const original = createMockEvent({
      recurrence: {
        kind: "occurrence",
        seriesId: "0123456789abcdef11111111" as EventId,
      },
    });
    const id = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original,
      source: "local",
    });
    const opportunity =
      useRecurrenceScopeOpportunityStore.getState().opportunity;
    if (!opportunity) throw new Error("Expected opportunity");

    showRecurrenceScopeToast(opportunity);
    expect(mocks.update).toHaveBeenCalledWith(
      EVENT_DELETED_TOAST_ID,
      expect.objectContaining({
        closeButton: false,
        closeOnClick: false,
        onClose: expect.any(Function),
      }),
    );
    const [content] = mocks.toast.mock.calls.at(0) as unknown as [ReactNode];
    render(content);

    await userEvent.click(
      screen.getByRole("button", { name: /this & following/i }),
    );

    expect(
      useRecurrenceScopeOpportunityStore.getState().opportunity,
    ).toMatchObject({
      id,
      status: "requested",
      requestedScope: "thisAndFollowing",
    });
    expect(screen.getByRole("button", { name: /all/i })).toBeVisible();
  });

  it("dismisses only the matching live scope offer", () => {
    const original = createMockEvent({
      recurrence: {
        kind: "occurrence",
        seriesId: "0123456789abcdef11111111" as EventId,
      },
    });
    const staleId = recurrenceScopeOpportunityActions.begin({
      kind: "replace",
      original,
      input: {
        content: { kind: "details", title: "Original", description: "" },
        schedule: original.schedule,
        recurrence: { kind: "preserve" },
        scope: "this",
      },
      source: "local",
    });
    const activeId = recurrenceScopeOpportunityActions.begin({
      kind: "delete",
      original,
      source: "local",
    });

    dismissRecurrenceScopeToast(staleId);
    expect(mocks.dismiss).not.toHaveBeenCalled();

    dismissRecurrenceScopeToast(activeId);
    expect(mocks.dismiss).toHaveBeenCalledWith(EVENT_DELETED_TOAST_ID);
  });
});
