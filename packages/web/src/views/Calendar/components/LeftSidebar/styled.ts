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
import { FlexDirections } from "@web/components/Flex/styled";

import { SidebarProps, SectionProps } from "./sidebar.types";

export const getSidebarToggleIcon = (isToggled: boolean) => {
  if (isToggled) {
    return StyledCollapseIcon;
  } else {
    return StyledOpenIcon;
  }
};

export const StyledSidebarList = styled.div`
  height: 400px;
  overflow: auto;
  padding-bottom: 20px;
  padding-left: 20px;

  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-thumb {
    background: ${getColor(ColorNames.GREY_2)};
    border-radius: 3px;
    &:hover {
      background: ${getColor(ColorNames.GREY_1)};
      transition: background-color 0.2s;
    }
  }
`;

export const Styled = styled(Flex)<SidebarProps>`
  background: ${getColor(ColorNames.GREY_3)};
  flex-direction: ${FlexDirections.COLUMN};
  height: 100%;
  overflow: hidden;
  position: relative;
  transition: 0.4s;
  width: ${({ isToggled }) =>
    isToggled ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH}px;
`;

export const StyledBottomRow = styled.div<SectionProps>`
  bottom: 0;
  border-top: 1px solid ${getColor(ColorNames.GREY_6)};
  height: 40px;
  padding: 10px 20px;
  position: absolute;
  width: 100%;
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
  color: ${getColor(ColorNames.GREY_6)};
  position: absolute;
  right: 7px;
  bottom: 8px;
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

const StyledOpenIcon = styled(SidebarOpenIcon)`
  cursor: pointer;
  color: ${getColor(ColorNames.GREY_6)};
  position: absolute;
  right: 7px;
  bottom: 8px;
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

export const StyledSomedaySection = styled(Flex)<SectionProps>`
  overflow: hidden;
  padding-top: 26px;
`;

export const StyledBottomSectionFlex = styled(Flex)`
  padding: 34px 38px 25px 14px;
`;
