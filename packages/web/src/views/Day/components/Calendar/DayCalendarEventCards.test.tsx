import { render } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DayTimedCalendarEvent } from "./DayCalendarEventCards";
import { describe, expect, it, mock } from "bun:test";

describe("DayTimedCalendarEvent", () => {
  it("attaches the form reference to the active draft", () => {
    const eventFormReference = mock();

    render(
      <DayTimedCalendarEvent
        deckLayout={null}
        event={{
          _id: "event-1",
          description: "",
          endDate: "2026-05-20T10:00:00.000Z",
          isAllDay: false,
          isSomeday: false,
          origin: Origin.COMPASS,
          position: gridEventDefaultPosition,
          priority: Priorities.UNASSIGNED,
          startDate: "2026-05-20T09:00:00.000Z",
          title: "Planning",
          user: "user-1",
        }}
        eventFormReference={eventFormReference}
        isActiveDraft={true}
        isPending={false}
        isPlaceholder={false}
        measurements={{
          allDayRow: null,
          colWidths: [180],
          hourHeight: 60,
          mainGrid: {
            bottom: 780,
            height: 780,
            left: 0,
            right: 180,
            top: 0,
            width: 180,
            x: 0,
            y: 0,
          },
        }}
        onOpenEvent={mock()}
        visibleDates={[{ date: dayjs("2026-05-20"), key: "2026-05-20" }]}
      />,
    );

    expect(eventFormReference).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});
