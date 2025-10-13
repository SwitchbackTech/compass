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

    /* Show scrollbar when hovering over the command palette container */
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

  /* Hide PostHog beta feature button 
  Posthog adds this by default, but we're using our
  own beta feature button, so we don't need both 
  */
  .beta-feature-button {
    visibility: hidden !important;
  }
`;
