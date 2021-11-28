import { createGlobalStyle } from "styled-components";

/* 
use this for things that are always global,
use ThemeProvider for things that change based on theme
*/
const GlobalStyle = createGlobalStyle`
  body {
    font-family: Verdana, Arial, Tahoma, Serif;
  }
`;

export default GlobalStyle;