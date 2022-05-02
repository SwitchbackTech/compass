import { createGlobalStyle } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";

export const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Poppins';
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  .react-datepicker-popper {
    z-index: ${ZIndex.MAX};
  }

  :focus-visible {
    outline: none;
  }
`;
