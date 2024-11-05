import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    color: {
      bg: {
        primary: string;
        secondary: string;
      };
      border: {
        primary: string;
        primaryDark: string;
        secondary: string;
      };
      fg: {
        primary: string;
      };
      gridLine: {
        primary: string;
      };
      panel: {
        bg: string;
        scrollbar: string;
        scrollbarActive: string;
        shadow: string;
        text: string;
      };
      shadow: {
        default: string;
      };
      status: {
        success: string;
        error: string;
        warning: string;
        info: string;
      };
      tag: {
        one: string;
        two: string;
        three: string;
      };
      text: {
        accent: string;
        light: string;
        lighter: string;
        lightInactive: string;
        dark: string;
        darkPlaceholder: string;
      };
    };
    text: {
      default: string;
      medium: string;
    };
    transition: {
      default: string;
    };
  }
}
