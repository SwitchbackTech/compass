import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { FlexDirections } from "@web/components/Flex/styled";
import {
  PAGE_MARGIN_TOP,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { SectionProps } from "./sidebar.types";

const ICON_ROW_HEIGHT = 40;

export const CalendarListContainer = styled.div``;

export const CalendarLabel = styled.label`
  align-items: center;
  display: flex;
`;

export const CalendarList = styled.ul`
  padding-left: 10px;
`;

export const EventPlaceholder = styled.div`
  align-items: center;
  border: 1px dashed ${({ theme }) => theme.color.border.secondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  display: flex;
  justify-content: center;
  margin: 5px 0;
  min-height: 32px;
  opacity: 0.5;
  transition: opacity 0.2s;

  &:focus {
    background-color: ${({ theme }) => theme.color.bg.primary};
  }

  &:hover {
    opacity: 1;
  }
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

export const SidebarTabContainer = styled.div`
  height: calc(100% - ${ICON_ROW_HEIGHT}px);
  overflow: auto;
  padding: 0 25px;
  width: ${SIDEBAR_OPEN_WIDTH}px;

  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: ${({ theme }) => theme.shape.borderRadius};
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
