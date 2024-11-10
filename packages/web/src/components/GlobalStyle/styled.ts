import { createGlobalStyle } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";

export const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Rubik', Arial, sans-serif;
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background-color: ${theme.color.bg.primary};
    overflow-x: hidden;
  }

  .react-datepicker-popper {
    z-index: ${ZIndex.MAX};
  }

  :focus-visible {
    outline: none;
  }
`;
