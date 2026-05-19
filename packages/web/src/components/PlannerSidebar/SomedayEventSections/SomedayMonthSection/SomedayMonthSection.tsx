import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";
import { useMonthLabel } from "./useMonthLabel";

interface Props {
  monthDate: WeekProps["component"]["startOfView"];
}

export const SomedayMonthSection: FC<Props> = ({ monthDate }) => {
  const monthLabel = useMonthLabel(monthDate);

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-text-lighter leading-none">
          {monthLabel}
        </h2>
      </div>

      <SomedayEvents category={Categories_Event.SOMEDAY_MONTH} />
    </div>
  );
};
