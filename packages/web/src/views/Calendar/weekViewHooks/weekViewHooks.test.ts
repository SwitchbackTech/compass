// import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { useGetWeekViewProps } from "./useGetWeekViewProps";

const weekViewProps = useGetWeekViewProps();
const { component, core, eventHandlers } = weekViewProps;

describe("Event Widths", () => {
  it("calculates correct width for 1 day events", () => {
    const res = core.getMultiDayEventWidth(1, 3);
    const f = 1;
  });
  // and for multi-day
});
