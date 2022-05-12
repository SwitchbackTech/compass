import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";
import { GRID_SCROLLBAR_WIDTH } from "@web/views/Calendar/calendar.constants";

export const StyledMainGrid = styled.div`
  flex: 1;
  margin-bottom: 20px;
  width: 100%;
  position: relative;
  overflow-y: visible;
  overflow-x: hidden;

  /* 
  webkit-scrollbar isn't standardized among browsers, 
  meaning it could break on some broswers or after a browser update.
  (see: https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar
  it's used here nonetheless because it was an easy way to get the grid widths
  to align correctly
  */
  ::-webkit-scrollbar {
    width: ${GRID_SCROLLBAR_WIDTH}px;
  }
  ::-webkit-scrollbar-thumb {
    border-radius: 7px;
    background: ${getColor(ColorNames.DARK_3)};
    &:hover {
      background: ${getColor(ColorNames.DARK_4)};
      transition: background-color 0.2s;
    }
  }
`;

export interface PrevDaysOverflowProps {
  widthPercent: number;
}

export const StyledPrevDaysOverflow = styled.div<PrevDaysOverflowProps>`
  width: ${({ widthPercent }) => widthPercent}%;
  height: 100%;
  background: ${getColor(ColorNames.WHITE_1)};
  opacity: 0.05;
  position: absolute;
`;
