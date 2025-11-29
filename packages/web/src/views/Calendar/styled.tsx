import { PropsWithChildren } from "react";
import styled from "styled-components";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { Flex } from "@web/components/Flex";

export const Styled = styled(Flex)`
  height: 100vh;
  overflow: hidden;
  width: 100vw;
`;

export function StyledCalendar({ children }: PropsWithChildren) {
  return (
    <div
      id={ID_MAIN}
      className="bg-bg-primary flex h-screen flex-1 flex-col items-center justify-center overflow-hidden p-8"
    >
      {children}
    </div>
  );
}
