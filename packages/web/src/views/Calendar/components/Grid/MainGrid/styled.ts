import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { EVENT_WIDTH_MINIMUM } from "@web/views/Calendar/layout.constants";
import {
  GRID_PADDING_BOTTOM,
  SCROLLBAR_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { Flex } from "@web/components/Flex";

export const StyledMainGrid = styled.div`
  flex: 1;
  margin-bottom: ${GRID_PADDING_BOTTOM}px;
  width: 100%;
  position: relative;
  overflow-y: visible;
  overflow-x: hidden;

  /* 
  webkit-scrollbar isn't standardized among browsers, 
  meaning it could break on some broswers or after a browser update.
  (see: https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar)
  it's used here nonetheless because it was an easy way to get the grid widths
  to align correctly
  */
  ::-webkit-scrollbar {
    width: ${SCROLLBAR_WIDTH}px;
  }
  ::-webkit-scrollbar-thumb {
    border-radius: 7px;
    background: ${getColor(ColorNames.GREY_3)};
    &:hover {
      background: ${getColor(ColorNames.GREY_4)};
      transition: background-color 0.2s;
    }
  }
`;

export const StyledPrevDaysOverflow = styled(Flex)`
  background: ${getColor(ColorNames.WHITE_1)};
  flex-basis: 100%;
  height: 100%;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
  opacity: 0.05;
  position: absolute;
  width: 100%;
`;
