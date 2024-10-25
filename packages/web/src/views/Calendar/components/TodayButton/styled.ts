import styled from "styled-components";
import { Flex } from "@web/components/Flex";

export const StyledTodayButton = styled(Flex)`
  align-items: center;
  color: ${({ theme }) => theme.color.text.light};
  cursor: pointer;
  display: flex;
  font-size: 17px;
  min-width: 80px;
  padding: 0 10px;

  &:hover {
    filter: brightness(160%);
    transition: filter 0.35s ease-out;
  }
`;
