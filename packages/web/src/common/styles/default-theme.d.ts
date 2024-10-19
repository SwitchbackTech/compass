import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    color: {
      bg: {
        primary: string;
      };
      border: {
        primary: string;
        secondary: string;
      };
      fg: {
        primary: string;
      };
      panel: {
        bg: string;
        shadow: string;
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
        primaryLight: string;
        primaryLightInactive: string;
      };
    };
  }
}
