import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { theme } from "@web/common/styles/theme";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { SomedayEvent } from "./SomedayEvent";
import { describe, expect, it, mock } from "bun:test";

const createEvent = (): Schema_Event =>
  ({
    _id: "event-1",
    priority: Priorities.WORK,
    title: "Plan launch",
  }) as Schema_Event;

const formProps = {
  getReferenceProps: () => ({}),
  refs: {
    setReference: () => undefined,
  },
} as unknown as Props_DraftForm;

const renderSomedayEvent = ({
  onClick = mock(),
}: {
  onClick?: () => void;
} = {}) => {
  render(
    <ThemeProvider theme={theme}>
      <SomedayEvent
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
      />
    </ThemeProvider>,
  );

  return { onClick };
};

describe("SomedayEvent", () => {
  it("does not open the row when Space is pressed on an inner action button", () => {
    const { onClick } = renderSomedayEvent();

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Migrate to previous week" }),
      { key: " " },
    );

    expect(onClick).not.toHaveBeenCalled();
  });
});
