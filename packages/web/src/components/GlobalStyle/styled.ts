import { createGlobalStyle } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { BASE_COLORS } from "@core/constants/colors";

export const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Poppins';
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background-color:${BASE_COLORS.DEEP_BLUE};
    overflow-x: hidden;
  }

  .react-datepicker-popper {
    z-index: ${ZIndex.MAX};
  }

  :focus-visible {
    outline: none;
  }
`;
