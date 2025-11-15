import styled from "styled-components";
import { Flex } from "@web/components/Flex";

export const StyledShortcutTip = styled(Flex)`
  background-color: ${({ theme }) => theme.color?.fg.primary};
  border: 1px solid ${({ theme }) => theme.color?.bg.primary};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: 5px 10px;
`;
