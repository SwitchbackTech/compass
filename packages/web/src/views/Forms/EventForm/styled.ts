import styled from "styled-components";
import { Priorities } from "@core/core.constants";
import { colorNameByPriority } from "@web/common/styles/colors";
import { InvertedColorNames } from "@web/common/types/styles";
import { EVENT_WIDTH_MINIMUM } from "@web/common/constants/grid.constants";
import {
  ANIMATION_TIME_3_MS,
  ZIndex,
} from "@web/common/constants/web.constants";
import { Flex } from "@web/components/Flex";
import { Textarea } from "@web/components/Textarea";
import { getColor, getInvertedColor } from "@web/common/utils/colors";
import { Button } from "@web/components/Button";

import { StyledFormProps } from "./types";

export const StyledEventForm = styled.form<StyledFormProps>`
  ${({ isOpen }) =>
    isOpen
      ? `
      min-height: 255px;
      padding: 18px 20px;
        `
      : ``}

  /* overflow: visible; */
  box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  width: 585px;
  font-size: 20px;
  background: ${({ priority }) =>
    getColor(colorNameByPriority[priority || Priorities.UNASSIGNED])};
  color: ${({ priority }) =>
    getInvertedColor(
      colorNameByPriority[
        priority || Priorities.UNASSIGNED
      ] as InvertedColorNames
    )};
  transition: ${ANIMATION_TIME_3_MS};
  z-index: ${ZIndex.LAYER_2};
`;

export const StyledDescriptionField = styled(Textarea)`
  background: transparent;
  width: calc(100% - 20px) !important;
  font-size: 20px;
  position: relative;
`;

export const StyledIconRow = styled(Flex)`
  justify-content: end;
`;

export const StyledSubmitButton = styled(Button)`
  border: 2px solid;
  margin-top: 15px;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
`;

export const StyledSubmitRow = styled(Flex)`
  align-items: right;
  justify-content: end;
`;

export const StyledTitleField = styled(Textarea)`
  background: transparent;
  /* padding: 10px 0; */
  height: 40px;
  font-size: 35px;
`;
