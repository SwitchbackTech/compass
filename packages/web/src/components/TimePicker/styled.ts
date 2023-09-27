import styled from "styled-components";
import { BASE_COLORS } from "@core/constants/colors";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { ANIMATION_TIME_3_MS } from "@web/common/constants/web.constants";
import { Divider } from "@web/components/Divider";
import { FORM_TIME_SIZE } from "@web/views/Forms/EventForm/styled";

export interface Props {
  bgColor?: string;
  isOpen?: boolean;
}

export const StyledTimePicker = styled.div<Props>`
  font-size: ${FORM_TIME_SIZE}px;
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
      color: ${BASE_COLORS.DEEP_BLUE};
    }

    &__menu {
      background: ${({ bgColor }) => bgColor};
      filter: brightness(87%);
      border-radius: 2px;
      min-width: 150px;

      &-list {
        font-size: ${FORM_TIME_SIZE - 3}px;
        padding: 0;
        ${({ isOpen: open }) => !open && "max-height: 0;"}
        transition: ${ANIMATION_TIME_3_MS};

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: ${getColor(ColorNames.GREY_3)};
          border-radius: 3px;
          &:hover {
            background: ${getColor(ColorNames.GREY_2)};
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
