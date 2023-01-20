import styled from "styled-components";
import { SidebarCollapseIcon, SidebarOpenIcon } from "@web/assets/svg";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { CheckBox } from "@web/components/CheckBox";
import { Flex } from "@web/components/Flex";
import {
  SIDEBAR_CLOSED_WIDTH,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { ZIndex } from "@web/common/constants/web.constants";

import { SidebarProps, SectionProps } from "./sidebar.types";

export const Styled = styled.div<SidebarProps>`
  background: ${getColor(ColorNames.GREY_3)};
  height: 100%;
  overflow: hidden;
  position: relative;
  transition: 0.4s;
  width: ${({ isToggled }) =>
    isToggled ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH}px;
`;

export const StyledBottomSection = styled.div<SectionProps>`
  height: ${({ height }) => height}px;
`;

export const StyledCheckBox = styled(CheckBox)`
  margin-right: 5px;
`;

export const StyledDividerWrapper = styled.div`
  cursor: row-resize;
  padding: 5px 0 7px 0;
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

export const StyledHeaderFlex = styled(Flex)`
  padding-left: 17px;
  width: calc(100% - 45px);
`;

export const StyledFiltersPopoverContent = styled.div`
  background: ${getColor(ColorNames.WHITE_5)};
  padding: 8px 8px 8px 5px;
  border-radius: 4px;
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

export const StyledPriorityFilterButton = styled.div`
  color: ${getColor(ColorNames.WHITE_1)};
  cursor: pointer;
  transition: 0.3s;

  &:hover {
    color: ${getColor(ColorNames.WHITE_4)};
  }
`;

export const StyledPriorityFilterItem = styled(Flex)`
  &:not(:last-child) {
    margin-bottom: 8px;
  }
`;

export const StyledSidebarOverflow = styled.div<SidebarProps>`
  position: absolute;
  background: ${({ isToggled }) =>
    isToggled ? getColor(ColorNames.GREY_3) : getColor(ColorNames.BLUE_2)};
  width: ${({ isToggled }) => (isToggled ? 0 : "100%")};
  height: 100%;
  right: 0;
  transition: 0.4s;
  z-index: ${ZIndex.LAYER_1};
`;

export const StyledTopSectionFlex = styled(Flex)<SectionProps>`
  padding: 34px 38px 0 14px;
  height: ${({ height }) => height};
  overflow: hidden;
`;

export const getSidebarToggleIcon = (isToggled: boolean) => {
  if (isToggled) {
    return StyledCollapseIcon;
  } else {
    return StyledOpenIcon;
  }
};
