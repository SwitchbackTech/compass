import { Flex } from "@web/components/Flex";
import styled from "styled-components";

export const StyledRepeatContainer = styled.div`
  &:hover {
    cursor: pointer;
  }
`;

export const StyledRepeatRow = styled(Flex)`
  align-items: center;
  flex-direction: row;
`;

interface Props {
  hasRepeat: boolean;
}

export const StyledRepeatText = styled.span<Props>`
  color: ${({ hasRepeat }) => !hasRepeat && "#586772"};
  font-size: 13px;
  padding-left: 2px;
  padding-right: 15px;

  &:focus,
  &:hover {
    filter: brightness(80%);
    font-weight: bold;
  }
`;

export const StyledSelectContainer = styled.div`
  /* width: 100%; */
`;
