import { ColorNames } from "@web/common/types/styles";
import { Text } from "@web/components/Text";
import React, { useState } from "react";
import { Popover } from "react-tiny-popover";

import { StyledTodayPopoverContainer, TodayNavigationButton } from "./styled";

export interface Props {
  today: string;
  onClick: () => void;
}

export const TodayButtonPopover: React.FC<Props> = ({ onClick, today }) => {
  const [isTodayPopoverOpen, setIsTodayPopoverOpen] = useState(false);

  return (
    <Popover
      isOpen={isTodayPopoverOpen}
      positions={["bottom"]}
      padding={10}
      content={
        <StyledTodayPopoverContainer>
          <Text colorName={ColorNames.WHITE_1} size={12}>
            {today}
          </Text>
        </StyledTodayPopoverContainer>
      }
    >
      <TodayNavigationButton
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
      </TodayNavigationButton>
    </Popover>
  );
};
