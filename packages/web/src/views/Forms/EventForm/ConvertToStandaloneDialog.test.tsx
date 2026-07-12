import userEvent from "@testing-library/user-event";
import { type ReactElement } from "react";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { createGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { ConvertToStandaloneDialog } from "@web/views/Forms/EventForm/ConvertToStandaloneDialog";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { describe, expect, it, mock } from "bun:test";

const onConfirm = mock();
const onCancel = mock();

const draftWithTitle = (title: string): GridEventDraft => {
  const draft = createGridEventDraft({
    kind: "timed",
    start: new Date("2026-05-31T10:00:00.000Z"),
    end: new Date("2026-05-31T11:00:00.000Z"),
    timeZone: "UTC",
  });
  if (draft.kind !== "create") throw new Error("Expected a create draft");

  return { ...draft, values: { ...draft.values, title } };
};

const renderDialog = (standaloneDraft: GridEventDraft | null) => {
  const ui: ReactElement = (
    <DraftContext.Provider
      value={
        {
          confirmation: {
            standaloneDraft,
            onConfirmConvertToStandalone: onConfirm,
            onCancelConvertToStandalone: onCancel,
          },
        } as never
      }
    >
      <ConvertToStandaloneDialog />
    </DraftContext.Provider>
  );

  return render(ui);
};

describe("ConvertToStandaloneDialog", () => {
  it("renders nothing when there is no pending standalone draft", () => {
    renderDialog(null);

    expect(
      screen.queryByText("Convert to standalone event?"),
    ).not.toBeInTheDocument();
  });

  it("shows the event name when a draft is pending", () => {
    renderDialog(draftWithTitle("Gym"));

    expect(
      screen.getByText("Convert to standalone event?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/“Gym” will be removed from its recurring series\./),
    ).toBeInTheDocument();
  });

  it("falls back to a generic name for an untitled draft", () => {
    renderDialog(draftWithTitle(""));

    expect(
      screen.getByText(
        /“this event” will be removed from its recurring series\./,
      ),
    ).toBeInTheDocument();
  });

  it("confirms and cancels via the action buttons", async () => {
    const user = userEvent.setup();
    renderDialog(draftWithTitle("Gym"));

    await user.click(screen.getByRole("button", { name: "Convert" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
