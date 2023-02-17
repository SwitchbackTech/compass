import styled from "styled-components";
import { Flex } from "@web/components/Flex";

export const Styled = styled.div`
  cursor: pointer;
  width: 20px;
  height: 20px;
  color: ${({ color }) => color};
`;

export const StyledPlaceholder = styled(Flex)`
  border: 2px solid ${({ color }) => color || "black"};
  border-radius: 2px;
  height: 100%;
  width: 100%;
`;
