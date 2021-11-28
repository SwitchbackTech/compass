import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Poppins';
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  .react-datepicker-popper {
    z-index: 10000;
  }

  :focus-visible {
    outline: none;
  }
`;
