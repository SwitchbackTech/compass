import { ColorNames } from "@core/types/color.types";
import { Text } from "@web/components/Text";
import { Dayjs } from "dayjs";
import React, { useState } from "react";
import { Popover } from "react-tiny-popover";

import { StyledTodayPopoverContainer, StyledTodayButton } from "./styled";

export interface Props {
  weekInFocus: number;
  today: Dayjs;
  onClick: () => void;
}

export const TodayButtonPopover: React.FC<Props> = ({
  onClick,
  today,
  weekInFocus,
}) => {
  const [isTodayPopoverOpen, setIsTodayPopoverOpen] = useState(false);

  if (today.week() !== weekInFocus) {
    return (
      <Popover
        isOpen={isTodayPopoverOpen}
        positions={["bottom"]}
        padding={10}
        content={
          <StyledTodayPopoverContainer>
            <Text colorName={ColorNames.WHITE_1} size={12}>
              {today.format("dddd, MMMM D")}
            </Text>
          </StyledTodayPopoverContainer>
        }
      >
        <StyledTodayButton
          onMouseEnter={() => setIsTodayPopoverOpen(true)}
          onMouseLeave={() => setIsTodayPopoverOpen(false)}
          cursor="pointer"
          onClick={() => {
            onClick();
            setIsTodayPopoverOpen(false);
          }}
          colorName={ColorNames.WHITE_2}
          size={20}
        >
          Today
        </StyledTodayButton>
      </Popover>
    );
  }
};
