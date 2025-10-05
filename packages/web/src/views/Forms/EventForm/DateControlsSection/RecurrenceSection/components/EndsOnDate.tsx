import React, { useMemo, useState } from "react";
import { darken } from "@core/util/color.utils";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { theme } from "@web/common/styles/theme";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { Flex } from "@web/components/Flex";
import { StyledText } from "@web/components/Text/styled";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledRepeatRow } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";

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
    <StyledRepeatRow>
      <StyledText size="l">Ends on:</StyledText>

      <Flex
        style={{
          cursor: "pointer",
          borderColor: theme.color.border.primaryDark,
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
      </Flex>
    </StyledRepeatRow>
  );
};
