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

  /* Command palette scrollbar styling */
  .command-palette .overflow-y-auto {
    /* Always reserve scrollbar space */
    &::-webkit-scrollbar {
      width: 8px;
    }

    /* Hide the scrollbar thumb by default (transparent) */
    &::-webkit-scrollbar-thumb {
      background-color: transparent;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }

    /* Show scrollbar when hovering anywhere in the palette or when scrolling */
    &:hover::-webkit-scrollbar-thumb,
    &:focus::-webkit-scrollbar-thumb,
    &:active::-webkit-scrollbar-thumb {
      background-color: ${theme.color.panel.scrollbar};
    }

    /* Even more visible on hover of the thumb itself */
    &:hover::-webkit-scrollbar-thumb:hover {
      background-color: ${theme.color.panel.scrollbarActive};
    }
  }

  /* Also show scrollbar when hovering over the command palette container */
  .command-palette:hover .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: ${theme.color.panel.scrollbar};
  }

  .command-palette:hover .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: ${theme.color.panel.scrollbarActive};
  }
`;
