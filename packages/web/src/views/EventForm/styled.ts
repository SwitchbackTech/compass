import styled from "styled-components";

import { Priorities } from "@core/core.constants";

import { colorNameByPriority } from "@web/common/styles/colors";
import { Flex } from "@web/components/Flex";
import { Textarea } from "@web/components/Textarea";
import { ColorNames, InvertedColorNames } from "@web/common/types/styles";
import { ANIMATION_TIME_3_MS } from "@web/common/constants/common";
import { getColor, getInvertedColor } from "@web/common/helpers/colors";
import { Button } from "@web/components/Button";

import { StyledProps } from "./types";

export const Styled = styled.div<StyledProps>`
  ${({ isOpen }) =>
    isOpen
      ? `
      min-height: 355px;
      max-height: 500px;
      padding: 18px 30px;
  `
      : `
    max-height: 0;
    min-height: 0;
    padding: 0 30px;
  `}

  overflow: auto;
  box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  width: 585px;
  font-size: 20px;
  background: ${({ priority }) =>
    getColor(colorNameByPriority[priority || Priorities.WORK])};
  color: ${({ priority }) =>
    getInvertedColor(
      colorNameByPriority[
        priority || Priorities.WORK
      ] as unknown as InvertedColorNames
    )};
  transition: ${ANIMATION_TIME_3_MS};
`;

export const StyledTitleField = styled(Textarea)`
  background: transparent;
  /* padding: 10px 0; */
  height: 55px;
  font-size: 50px;
`;

export const StyledPriorityFlex = styled(Flex)`
  margin: 20px 0;
`;

export const StyledDescriptionField = styled(Textarea)`
  background: transparent;
  width: calc(100% - 20px) !important;
  font-size: 20px;
  position: relative;
`;

export const StyledDeleteButton = styled(Button)`
/* these colors being overridden by sth */
  background: "#000000"
  color: "#000000";
  margin-top: 35px;

  &:hover {
      background: "red";
  }
`;

export const StyledSubmitButton = styled(Button)`
  background: ${getColor(ColorNames.WHITE_5)};
  color: ${getColor(ColorNames.GREY_1)};
  margin-top: 35px;

  &:hover {
    background: ${getColor(ColorNames.WHITE_3)};
  }
`;
