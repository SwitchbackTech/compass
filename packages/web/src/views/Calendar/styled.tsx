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
      className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary pt-8 pr-0 pb-0 pl-8"
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

export const WeekGridTrack = styled.div`
  container: week-grid-track / inline-size;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: ${WEEK_GRID_TRACK_MIN_WIDTH}px;
  position: relative;
  width: 100%;
`;
