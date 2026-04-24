import { type PropsWithChildren } from "react";
import styled from "styled-components";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { Flex } from "@web/components/Flex";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";

export const Styled = styled(Flex)`
  height: 100vh;
  overflow: hidden;
  width: 100vw;
`;

interface StyledCalendarProps extends PropsWithChildren {
  isSidebarOpen?: boolean;
}

export function StyledCalendar({
  children,
  isSidebarOpen,
}: StyledCalendarProps) {
  return (
    <div
      id={ID_MAIN}
      className="bg-bg-primary flex h-screen flex-1 flex-col items-center justify-center overflow-hidden p-8"
      style={
        isSidebarOpen
          ? { maxWidth: `calc(100vw - ${SIDEBAR_OPEN_WIDTH}px)` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
