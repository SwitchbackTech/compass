import styled from "styled-components";
import { ID_DATEPICKER_SIDEBAR } from "@web/common/constants/web.constants";
import { Text } from "@web/components/Text";

export const MonthPickerContainer = styled.div`
  position: relative;

  & .${ID_DATEPICKER_SIDEBAR} {
    width: 100%;
    box-shadow: none;
  }
`;

export const StyledMonthName = styled(Text)`
  display: block;
  padding-top: 18px;
`;
