import styled from "styled-components";
import { Text } from "@web/components/Text";

export const Styled = styled.div`
  position: relative;

  & .sidebarDatePicker {
    width: 100%;
    box-shadow: none;
  }
`;

export const StyledMonthName = styled(Text)`
  display: block;
  padding-top: 18px;
  margin-left: 50px;
`;
