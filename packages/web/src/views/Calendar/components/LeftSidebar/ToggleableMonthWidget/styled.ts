import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { Text } from "@web/components/Text";

import { ToggleArrow } from "../ToggleArrow";

export const Styled = styled.div`
  position: relative;

  & .sidebarDatePicker {
    width: 100%;
    box-shadow: none;
  }
`;

export const StyledToggleArrow = styled(ToggleArrow)`
  position: absolute;
  left: 20px;
  top: 30px;
  transition: position 4.9s;
  z-index: ${ZIndex.LAYER_2};
`;

export const StyledMonthName = styled(Text)`
  display: block;
  padding-top: 18px;
  margin-left: 50px;
`;
