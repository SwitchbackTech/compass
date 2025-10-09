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

  /* Command Palette Scrollbar Styling */
  .command-palette .overflow-y-auto {
    /* Always reserve scrollbar space */
    scrollbar-width: auto;
    
    /* Webkit scrollbar styling (Chrome, Safari, Edge) */
    &::-webkit-scrollbar {
      width: 8px;
    }

    /* Hide the scrollbar thumb by default (transparent) */
    &::-webkit-scrollbar-thumb {
      background-color: transparent;
      border-radius: ${({ theme }) => theme.shape.borderRadius};
      transition: background-color 0.3s ease;
    }

    /* On hover of the container, make the scrollbar thumb visible */
    &:hover::-webkit-scrollbar-thumb {
      background-color: ${({ theme }) => theme.color.panel.scrollbar};
    }

    /* On hover of the thumb itself, make it more visible */
    &:hover::-webkit-scrollbar-thumb:hover {
      background-color: ${({ theme }) => theme.color.panel.scrollbarActive};
    }

    /* Show scrollbar during active scrolling */
    &.scrolling::-webkit-scrollbar-thumb {
      background-color: ${({ theme }) => theme.color.panel.scrollbar};
    }
  }
`;
