import { createGlobalStyle } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";

export const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Poppins';
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background-color:rgb(28, 49, 66);
    overflow-x: hidden;
  }

  .react-datepicker-popper {
    z-index: ${ZIndex.MAX};
  }

  :focus-visible {
    outline: none;
  }
`;
