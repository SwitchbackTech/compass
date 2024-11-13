import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import {
  SIDEBAR_CLOSED_WIDTH,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { ZIndex } from "@web/common/constants/web.constants";
import { FlexDirections } from "@web/components/Flex/styled";
import { ArrowLineLeftIcon } from "@web/components/Icons/ArrowLineLeft";
import { ArrowLineRightIcon } from "@web/components/Icons/ArrowLineRight";

import { SidebarProps, SectionProps } from "./sidebar.types";

export const getSidebarToggleIcon = (isToggled: boolean) => {
  if (isToggled) {
    return ArrowLineLeftIcon;
  } else {
    return ArrowLineRightIcon;
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
    background-color: ${({ theme }) => theme.color.panel.scrollbar};
    border-radius: 3px;

    &:hover {
      background-color: ${({ theme }) => theme.color.panel.scrollbarActive};
    }
  }
`;

export const StyledLeftIconGroup = styled.div`
  gap: 20px;
  display: flex;
`;

export const StyledLeftSidebar = styled(Flex)<SidebarProps>`
  background: ${({ theme }) => theme.color.panel.bg};
  flex-direction: ${FlexDirections.COLUMN};
  height: 100%;
  overflow: hidden;
  position: relative;
  transition: 0.4s;
  width: ${({ isToggled }) =>
    isToggled ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH}px;
`;

export const StyledIconRow = styled(Flex)<SectionProps>`
  bottom: 0;
  border-top: 1px solid ${({ theme }) => theme.color.border.primary};
  height: 40px;
  flex-direction: ${FlexDirections.ROW};
  padding: 9px 44px 9px 20px;
  position: absolute;
  width: 100%;
`;

export const StyledSidebarOverflow = styled.div<SidebarProps>`
  position: absolute;
  background: ${({ isToggled, theme }) =>
    isToggled ? theme.color.panel.bg : theme.color.bg.primary};
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
