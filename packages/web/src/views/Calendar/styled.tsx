import { type PropsWithChildren } from "react";
import styled from "styled-components";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { Flex } from "@web/components/Flex";
import { WEEK_GRID_TRACK_MIN_WIDTH } from "./layout.constants";

export const Styled = styled(Flex)`
  height: 100vh;
  overflow: hidden;
  width: 100vw;
`;

export function StyledCalendar({ children }: PropsWithChildren) {
  return (
    <div
      id={ID_MAIN}
      className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary p-8"
    >
      {children}
    </div>
  );
}

export const WeekGridScrollFrame = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
`;

export const WeekGridScroller = styled.div`
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  width: 100%;

  &::-webkit-scrollbar {
    display: none;
    height: 0;
    width: 0;
  }

  &:focus-visible {
    outline: ${({ theme }) => `1px solid ${theme.color.text.accent}`};
    outline-offset: -1px;
  }
`;

export const WeekGridScrollRail = styled.div<{ $isVisible: boolean }>`
  background: ${({ theme }) => theme.color.gridLine.primary};
  border-radius: 999px;
  bottom: 8px;
  height: 2px;
  left: 50%;
  opacity: ${({ $isVisible }) => ($isVisible ? 0.9 : 0)};
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  transform: translateX(-50%);
  transition: opacity 160ms ease;
  width: min(184px, calc(100% - 84px));
  z-index: 4;
`;

export const WeekGridScrollThumb = styled.div`
  background: ${({ theme }) =>
    `linear-gradient(90deg, ${theme.color.gradient.accentLight.start}, ${theme.color.gradient.accentLight.end})`};
  border-radius: inherit;
  height: 100%;
  position: absolute;
  top: 0;
`;

export const WeekGridTrack = styled.div`
  container: week-grid-track / inline-size;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: ${WEEK_GRID_TRACK_MIN_WIDTH}px;
  position: relative;
  width: 100%;
`;
