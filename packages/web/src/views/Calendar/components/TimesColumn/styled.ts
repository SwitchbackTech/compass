import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";

export const StyledDayTimes = styled.div`
  position: absolute;
  height: 100%;
  top: calc(100% / 11 + -5px);
  z-index: 2;
  color: ${getColor(ColorNames.WHITE_4)}80;

  & > div {
    height: calc(100% / 11);

    & > span {
      display: block;
    }
  }
`;
