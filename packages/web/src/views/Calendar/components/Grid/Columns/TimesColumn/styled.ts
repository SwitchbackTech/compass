import styled from "styled-components";
import { Colors } from "@core/types/color.types";
import { ZIndex } from "@web/common/constants/web.constants";

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
  z-index: ${ZIndex.LAYER_1};

  & > div {
    height: calc(100% / 11);

    & > span {
      display: block;
    }
  }
`;
