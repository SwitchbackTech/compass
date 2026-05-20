import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";

interface Props {
  weekLabel: string;
}

export const SomedayWeekSection: FC<Props> = ({ weekLabel }) => {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-text-lighter leading-none">
          {weekLabel}
        </h2>
      </div>

      <SomedayEvents category={Categories_Event.SOMEDAY_WEEK} />
    </div>
  );
};
