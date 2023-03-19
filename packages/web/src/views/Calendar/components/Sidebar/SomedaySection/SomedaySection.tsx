import React, { FC, useRef } from "react";
import { ColorNames } from "@core/types/color.types";
import { Text } from "@web/components/Text";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { ID_SOMEDAY_EVENTS } from "@web/common/constants/web.constants";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { SomedayEventsProps } from "./hooks/useSomedayEvents";

interface Props {
  flex?: number;
  somedayProps: SomedayEventsProps;
}

export const SomedaySection: FC<Props> = ({ flex, somedayProps }) => {
  const { state, util } = somedayProps;

  const somedayRef = useRef();

  return (
    <Styled flex={flex} onClick={util.onSectionClick} ref={somedayRef}>
      {state.isProcessing && <AbsoluteOverflowLoader />}

      <StyledHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text colorName={ColorNames.WHITE_1} role="heading" size={22}>
          {state.weekLabel}
        </Text>

        <div onClick={(e) => e.stopPropagation()}>
          <TooltipWrapper
            description="Add to this week"
            onClick={util.onSectionClick}
            shortcut="S"
          >
            <div role="button">
              <StyledAddEventButton size={25}>+</StyledAddEventButton>
            </div>
          </TooltipWrapper>
        </div>
      </StyledHeader>

      <div id={ID_SOMEDAY_EVENTS}></div>
    </Styled>
  );
};
