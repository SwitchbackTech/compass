import styled from "styled-components";
import { brighten } from "@core/util/color.utils";
import {
  GRID_PADDING_BOTTOM,
  SCROLLBAR_WIDTH,
} from "@web/views/Calendar/layout.constants";

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
    background: ${({ theme }) => brighten(theme.color.bg.primary, 10)};
    &:hover {
      background: ${({ theme }) => brighten(theme.color.bg.primary, 20)};
      transition: background-color 0.2s;
    }
  }
`;
