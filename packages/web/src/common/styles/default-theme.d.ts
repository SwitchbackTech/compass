import "styled-components";
import { textDark, textLight } from "./colors";

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
        primaryDark: string;
      };
      gridLine: {
        primary: string;
      };
      menu: {
        bg: string;
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
      size: {
        xs: string;
        s: string;
        m: string;
        l: string;
        xl: string;
        xxl: string;
        xxxl: string;
        "4xl": string;
        "5xl": string;
      };
      weight: {
        light: number;
        regular: number;
        medium: number;
        bold: number;
        extraBold: number;
      };
    };
    getContrastText: (
      backgroundColor: string,
    ) => typeof textLight | typeof textDark;
    transition: {
      default: string;
    };
    shape: {
      borderRadius: string;
    };
    spacing: {
      xs: string;
      s: string;
      m: string;
      l: string;
      xl: string;
    };
  }
}
