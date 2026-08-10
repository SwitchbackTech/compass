import type React from "react";
import { useMemo, useState } from "react";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

export interface EndsOnDateProps {
  minDate?: string;
  until?: Date | null;
  setUntil: (date: Date | null) => void;
}

export const EndsOnDate = ({
  until,
  setUntil,
  minDate = new Date().toISOString(),
}: EndsOnDateProps) => {
  const [open, setOpen] = useState(false);
  const miniDate = useMemo(() => parseCompassEventDate(minDate), [minDate]);

  return (
    <div className="mb-1 flex w-full basis-full items-center gap-2 p-0">
      <span className="relative text-m">Ends on:</span>

      <div
        className="flex items-start"
        style={{
          cursor: "pointer",
          borderColor: "var(--border-strong)",
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
              calendarClassName="recurrenceUntilDatePicker"
              isOpen={open}
              minDate={miniDate.toDate()}
              onCalendarClose={() => setOpen(false)}
              onChange={() => null}
              onSelect={(date) => {
                setUntil(date);
                setOpen(false);
              }}
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
