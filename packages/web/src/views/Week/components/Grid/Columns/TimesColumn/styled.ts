import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { WEEK_TIMED_VISIBLE_HOURS } from "@web/views/Week/layout.constants";

interface Props {
  color: string;
}

export const StyledTimesLabel = styled.div<Props>`
  color: ${({ color }) => color};
`;

export const StyledDayTimes = styled.div`
  height: 100%;
  position: absolute;
  top: calc(100% / ${WEEK_TIMED_VISIBLE_HOURS} + -5px);
  z-index: ${ZIndex.LAYER_1};

  & > div {
    height: calc(100% / ${WEEK_TIMED_VISIBLE_HOURS});

    & > span {
      display: block;
    }
  }
`;
