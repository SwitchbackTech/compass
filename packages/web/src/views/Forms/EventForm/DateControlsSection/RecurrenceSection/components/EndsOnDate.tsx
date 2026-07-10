import type React from "react";
import { useMemo, useState } from "react";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { darken } from "@web/common/styles/color.utils";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

export interface EndsOnDateProps {
  bgColor: string;
  inputColor: string;
  minDate?: string;
  until?: Date | null;
  setUntil: React.Dispatch<React.SetStateAction<Date | null>>;
}

export const EndsOnDate = ({
  until,
  bgColor,
  inputColor,
  setUntil,
  minDate = new Date().toISOString(),
}: EndsOnDateProps) => {
  const [open, setOpen] = useState(false);
  const miniDate = useMemo(() => parseCompassEventDate(minDate), [minDate]);

  return (
    <div className="mb-1 flex w-full basis-full items-center gap-2 p-0">
      <span className="relative text-l">Ends on:</span>

      <div
        className="flex items-start"
        style={{
          cursor: "pointer",
          borderColor: "var(--compass-color-border-primary-dark)",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
        }}
      >
        <TooltipWrapper
          description="Select recurrence end date"
          onClick={() => setOpen(true)}
        >
          <div id="portal">
            <DatePicker
              bgColor={darken(bgColor, 15)}
              calendarClassName="recurrenceUntilDatePicker"
              inputColor={inputColor}
              isOpen={open}
              minDate={miniDate.toDate()}
              onCalendarClose={() => setOpen(false)}
              onChange={() => null}
              onSelect={(date) => setUntil(date)}
              selected={until}
              title="Select recurrence end date"
              view="grid"
              portalId="portal"
            />
          </div>
        </TooltipWrapper>
      </div>
    </div>
  );
};
