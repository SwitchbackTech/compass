import styled from "styled-components";
import { Colors, ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";

interface Props {
  color: Colors;
}

export const StyledTimesLabel = styled.div<Props>`
  color: ${({ color }) => color};
`;

export const StyledDayTimes = styled.div`
  height: 100%;
  position: absolute;
  top: calc(100% / 11 + -5px);
  z-index: 2;

  & > div {
    height: calc(100% / 11);

    & > span {
      display: block;
    }
  }
`;

export const StyledDayTimesOld = styled.div`
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
