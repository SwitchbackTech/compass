import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import {
  PAGE_MARGIN_TOP,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { FlexDirections } from "@web/components/Flex/styled";
import { ArrowLineLeftIcon } from "@web/components/Icons/ArrowLineLeft";
import { ArrowLineRightIcon } from "@web/components/Icons/ArrowLineRight";

import { SectionProps } from "./sidebar.types";

const ICON_ROW_HEIGHT = 40;

export const getSidebarToggleIcon = (isToggled: boolean) => {
  if (isToggled) {
    return ArrowLineLeftIcon;
  } else {
    return ArrowLineRightIcon;
  }
};

export const CalendarListContainer = styled.div``;

export const CalendarLabel = styled.label`
  display: flex;
  align-items: "center";
`;

export const EventPlaceholder = styled.div`
  align-items: center;
  border: 1px dashed ${({ theme }) => theme.color.border.secondary};
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  margin: 5px 0;
  min-height: 32px;
  opacity: 0.5;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

export const LeftIconGroup = styled.div`
  gap: 20px;
  display: flex;
`;

export const SidebarContainer = styled(Flex)`
  background: ${({ theme }) => theme.color.panel.bg};
  color: ${({ theme }) => theme.color.panel.text};
  flex-direction: ${FlexDirections.COLUMN};
  height: 100%;
  padding-top: ${PAGE_MARGIN_TOP}px;
  overflow: hidden;
  position: relative;
  transition: 0.4s;
  min-width: ${SIDEBAR_OPEN_WIDTH}px;
`;

export const IconRow = styled(Flex)<SectionProps>`
  align-items: center;
  bottom: 0;
  border-top: 1px solid ${({ theme }) => theme.color.border.primary};
  height: ${ICON_ROW_HEIGHT}px;
  flex-direction: ${FlexDirections.ROW};
  padding: 0 25px;
  position: absolute;
  width: 100%;
`;

export const SidebarTabContainer = styled.div`
  height: calc(100% - ${ICON_ROW_HEIGHT}px);
  overflow: auto;
  padding: 0 25px;
  width: 100%;

  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 3px;
  }
  &:hover {
    ::-webkit-scrollbar-thumb {
      background-color: ${({ theme }) => theme.color.panel.scrollbar};
    }
  }
`;

export const SidebarList = styled.div`
  overflow: auto;
  width: 100%;
`;

export const SomedaySection = styled(Flex)<SectionProps>`
  overflow: hidden;
  padding-top: 26px;
`;
