import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";

export interface Props {
  flex?: number;
}

export const Styled = styled.div<Props>`
  color: ${({ theme }) => theme.color.panel.text};
  flex: ${({ flex }) => flex};
  margin-bottom: 5px;
  width: 100%;
`;

export const StyledAddEventButton = styled(Text)`
  cursor: pointer;
  margin-right: 30px;
  &:hover {
    filter: brightness(160%);
    transition: filter 0.35s ease-out;
  }
`;

export const StyledSidebarHeader = styled(Flex)`
  margin: 10px 5px 20px 20px;
`;

export const StyledSidebarTopHeader = styled(StyledSidebarHeader)`
  padding-top: 25px;
`;

export const StyledHeaderTitle = styled(Text)`
  margin: 0 10px;
`;

export const StyledPaginationFlex = styled(Flex)`
  width: 40px;
`;

export const StyledEventsList = styled.div`
  padding: 20px;
  height: calc(100% - 67px);
`;
