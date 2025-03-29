import styled from "styled-components";
import { darken } from "@core/util/color.utils";
import { Divider } from "@web/components/Divider";

export interface Props {
  bgColor?: string;
}

export const StyledTimePicker = styled.div<Props>`
  font-size: ${({ theme }) => theme.text.size.l};
  min-width: 90px;
  position: relative;

  & span[aria-live="polite"] {
    display: none;
  }

  & .timepicker {
    &__option {
      &--is-selected,
      &--is-focused {
        background-color: ${({ bgColor }) => bgColor};
        color: black;
        filter: brightness(140%);
      }
    }

    &__control {
      border: none;
      ${({ bgColor }) => bgColor && `background: ${bgColor}`};
      box-shadow: none;
      border-radius: 0;
      min-height: 100%;
      &:hover {
        filter: brightness(87%);
      }
    }
    &__value-container {
      height: 100%;
      padding: 0px 8px;
    }

    &__indicators {
      display: none;
    }

    &__single-value {
      color: ${({ theme }) => theme.color.text.dark};
    }

    &__menu {
      background: ${({ bgColor }) => bgColor};
      filter: brightness(87%);
      border-radius: 2px;
      min-width: 150px;

      &-list {
        font-size: ${({ theme }) => theme.text.size.m};
        padding: 0;
        transition: ${({ theme }) => theme.transition.default};

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: ${({ bgColor }) => bgColor && darken(bgColor, 40)};
          border-radius: ${({ theme }) => theme.shape.borderRadius};
          &:hover {
            background: ${({ bgColor }) => bgColor && darken(bgColor, 80)};
            transition: background-color 0.2s;
          }
        }
      }
    }
  }
`;

export const StyledDivider = styled(Divider)`
  position: absolute;
  bottom: 2px;
  left: 2px;
`;
