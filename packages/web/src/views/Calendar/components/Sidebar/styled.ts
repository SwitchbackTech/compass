import styled from "styled-components";
import { SidebarCollapseIcon, SidebarOpenIcon } from "@web/assets/svg";
import { getColor } from "@web/common/utils/colors";
import { ColorNames } from "@web/common/types/styles";
import { CheckBox } from "@web/components/CheckBox";
import { Flex } from "@web/components/Flex";
import {
  SIDEBAR_CLOSED_WIDTH,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { ZIndex } from "@web/common/constants/web.constants";

export interface Props {
  isToggled: boolean;
}

export const Styled = styled.div<Props>`
  background: ${getColor(ColorNames.DARK_3)};
  height: 100%;
  overflow: hidden;
  position: relative;
  transition: 0.4s;
  width: ${({ isToggled }) =>
    isToggled ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH}px;
`;

export const StyledSidebarOverflow = styled.div<Props>`
  position: absolute;
  background: ${({ isToggled }) =>
    isToggled ? getColor(ColorNames.DARK_3) : getColor(ColorNames.DARK_2)};
  width: ${({ isToggled }) => (isToggled ? 0 : "100%")};
  height: 100%;
  right: 0;
  transition: 0.4s;
  z-index: ${ZIndex.LAYER_1};
`;

// $$ make this into variable or dynamic so you don't have to duplicate styles
const StyledOpenIcon = styled(SidebarOpenIcon)`
  cursor: pointer;
  color: #7a858d;
  position: absolute;
  right: 7px;
  top: 42px;
  z-index: ${ZIndex.LAYER_1};

  &:hover {
    color: ${getColor(ColorNames.WHITE_2)};
  }
`;

const StyledCollapseIcon = styled(SidebarCollapseIcon)`
  cursor: pointer;
  color: #7a858d;
  position: absolute;
  right: 7px;
  top: 42px;
  z-index: ${ZIndex.LAYER_1};

  &:hover {
    color: ${getColor(ColorNames.WHITE_2)};
  }
`;

export const renderStyledSidebarToggleIcon = (isToggled: boolean) => {
  if (isToggled) {
    return StyledCollapseIcon;
  } else {
    return StyledOpenIcon;
  }
};

export interface SectionProps {
  height?: string;
}

export const StyledTopSectionFlex = styled(Flex)<SectionProps>`
  padding: 34px 38px 0 14px;
  height: ${({ height }) => height};
  overflow: hidden;
`;

export const StyledFiltersPopoverContent = styled.div`
  background: ${getColor(ColorNames.WHITE_6)};
  padding: 8px 8px 8px 5px;
  border-radius: 4px;
`;

export const StyledHeaderFlex = styled(Flex)`
  padding-left: 17px;
  width: calc(100% - 45px);
`;

export const StyledCheckBox = styled(CheckBox)`
  margin-right: 5px;
`;

export const StyledPriorityFilterItem = styled(Flex)`
  &:not(:last-child) {
    margin-bottom: 8px;
  }
`;

export const StyledPriorityFilterButton = styled.div`
  color: ${getColor(ColorNames.WHITE_1)};
  cursor: pointer;
  transition: 0.3s;

  &:hover {
    color: ${getColor(ColorNames.WHITE_4)};
  }
`;

export const StyledDividerWrapper = styled.div`
  cursor: row-resize;
  padding: 5px 0 7px 0;
`;

export const StyledBottomSection = styled.div<SectionProps>`
  height: ${({ height }) => height}px;
`;

export interface FutureEventsProps {
  shouldSetTopMargin?: boolean;
}
