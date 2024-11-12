import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { ZIndex } from "@web/common/constants/web.constants";

export const StyledRightSidebar = styled(Flex)`
  background: ${({ theme }) => theme.color.bg.primary};
  bottom: 0;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  color: ${({ theme }) => theme.color.text.light};
  display: flex;
  flex-direction: column;
  height: calc(100% - 82px);
  justify-content: space-between;
  padding: 10px;
  position: fixed;
  right: 0;
  z-index: ${ZIndex.MAX};
`;
