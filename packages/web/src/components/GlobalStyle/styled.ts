import { createGlobalStyle } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { c } from "@web/common/styles/colors";
import { theme } from "@web/common/styles/theme";

export const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Rubik', Arial, sans-serif;
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background-color: ${theme.color.bg.primary};
    overflow: hidden;
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

  /* Toast styling - override react-toastify defaults to use theme colors */
  .Toastify__toast-container {
    .Toastify__toast {
      background-color: ${theme.color.bg.primary};
      color: ${theme.color.text.lighter};
      box-shadow: 0 4px 2px ${c.gray900}, 0 0 10px ${c.blue400};
    }

    .Toastify__toast--dark {
      background-color: ${theme.color.bg.primary};
      color: ${theme.color.text.lighter};
    }

    .Toastify__progress-bar {
      background: linear-gradient(to right, ${c.blue100}, ${c.blueGray100});
    }

    .Toastify__progress-bar--dark {
      background: linear-gradient(to right, ${c.blue100}, ${c.blueGray100});
    }

    .Toastify__close-button {
      color: ${theme.color.text.lighter};
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }

    .Toastify__close-button--dark {
      color: ${theme.color.text.lighter};
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }
  }
  `;
