import { fireEvent, render, screen } from "@testing-library/react";
import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { Categories_Event } from "@core/types/event.types";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  gridColorByPriority,
  gridHoverColorByPriority,
} from "@web/common/styles/theme.util";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { SomedayEvent } from "./SomedayEvent";
import { describe, expect, it, mock } from "bun:test";

const createEvent = (): Event =>
  createMockEvent({
    priority: Priorities.WORK,
    content: { kind: "details", title: "Plan launch", description: "" },
  });

const formProps = {
  getReferenceProps: () => ({}),
  refs: {
    setReference: () => undefined,
  },
} as unknown as Props_DraftForm;

const renderSomedayEvent = ({
  calendarIdentity,
  onClick = mock(),
}: {
  calendarIdentity?: { name: string; backgroundColor: string } | null;
  onClick?: () => void;
} = {}) => {
  render(
    <SomedayEvent
      calendarIdentity={calendarIdentity}
      category={Categories_Event.SOMEDAY_WEEK}
      event={createEvent()}
      formProps={formProps}
      interactionRef={() => undefined}
      onBlur={() => undefined}
      onClick={onClick}
      onFocus={() => undefined}
      onMigrate={() => undefined}
      priority={Priorities.WORK}
      status={{ isDrafting: false, isDragging: false }}
    />,
  );

  return { onClick };
};

describe("SomedayEvent", () => {
  it("uses the calendar grid priority colors for saved events", () => {
    renderSomedayEvent();

    const event = screen.getAllByRole("button")[0];

    expect(event.style.getPropertyValue("--someday-event-bg")).toBe(
      gridColorByPriority[Priorities.WORK],
    );
    expect(event.style.getPropertyValue("--someday-event-hover-bg")).toBe(
      gridHoverColorByPriority[Priorities.WORK],
    );
    expect(event.className).toContain("text-text-dark");
    expect(event.className).toContain("hover:cursor-pointer");
    expect(
      event
        .querySelector("[data-someday-drag-affordance]")
        ?.getAttribute("class"),
    ).toContain("cursor-grab");
  });

  it("does not open the row when Space is pressed on an inner action button", () => {
    const { onClick } = renderSomedayEvent();

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Migrate to previous week" }),
      { key: " " },
    );

    expect(onClick).not.toHaveBeenCalled();
  });

  it("includes the calendar name in its accessible label when a calendar identity is resolved", () => {
    renderSomedayEvent({
      calendarIdentity: { name: "Local", backgroundColor: "#ffffff" },
    });

    expect(
      screen.getByRole("button", { name: "Plan launch, Local calendar" }),
    ).toBeInTheDocument();
  });

  it("omits a calendar suffix from its accessible label when no calendar identity is resolved", () => {
    renderSomedayEvent();

    const event = screen.getAllByRole("button")[0];
    expect(event.getAttribute("aria-label")).toBeNull();
  });
});
