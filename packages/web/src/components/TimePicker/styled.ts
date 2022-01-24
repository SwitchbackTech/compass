import styled from "styled-components";

import { Divider } from "@web/components/Divider";
import { ANIMATION_TIME_3_MS } from "@web/common/constants/web.constants";

export interface Props {
  open?: boolean;
}

export const Styled = styled.div<Props>`
  min-width: 100px;
  position: relative;

  & span[aria-live="polite"] {
    display: none;
  }

  /* & > div {
    height: 100%;
  } */

  & .timepicker {
    &__control {
      color: white;
      border: none;
      background: #516371;
      box-shadow: none;
      border-radius: 0;
      min-height: 100%;
    }

    &__input {
      color: white;
    }

    &__value-container {
      height: 100%;
      padding: 0px 8px;
    }

    &__indicators {
      display: none;
    }

    &__single-value {
      color: white;
    }

    &__menu {
      background: #516371;
      border-radius: 2px;

      &-list {
        padding: 0;
        ${({ open }) => !open && "max-height: 0;"}
        transition: ${ANIMATION_TIME_3_MS};
      }
    }

    &__option {
      color: white;
      font-size: 16px;
      font-weight: 600;

      &--is-focused,
      &--is-selected {
        background: #8293a1;
      }
    }
  }
`;

export const StyledDivider = styled(Divider)`
  position: absolute;
  bottom: 2px;
  left: 2px;
`;
