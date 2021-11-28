import { DefaultTheme } from "styled-components";

const lightTheme: DefaultTheme = {
  mode: "light",
  colors: {
    main: "white",
    secondary: "black",
  },
};

const darkTheme: DefaultTheme = {
  mode: "dark",
  colors: {
    main: "black",
    secondary: "white",
  },
};

export { lightTheme, darkTheme };