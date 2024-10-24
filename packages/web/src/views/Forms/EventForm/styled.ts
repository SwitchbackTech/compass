import styled from "styled-components";
import { Priorities, Priority } from "@core/constants/core.constants";
import { EVENT_WIDTH_MINIMUM } from "@web/views/Calendar/layout.constants";
import {
  ANIMATION_TIME_3_MS,
  ZIndex,
} from "@web/common/constants/web.constants";
import { Flex } from "@web/components/Flex";
import { Textarea } from "@web/components/Textarea";
import { Button } from "@web/components/Button";
import { hoverColorsByPriority } from "@web/common/styles/theme";

import { StyledFormProps } from "./types";

export const FORM_TIME_SIZE = 17;

interface SomedayFormProps extends StyledFormProps {
  x?: number;
  y?: number;
}

export const StyledEventForm = styled.form<SomedayFormProps>`
  background: ${({ priority }) =>
    hoverColorsByPriority[(priority as Priority) || Priorities.UNASSIGNED]};
  border-radius: 4px;
  box-shadow: 0px 5px 5px ${({ theme }) => theme.color.shadow.default};
  font-size: 20px;
  padding: 18px 20px;
  transition: ${ANIMATION_TIME_3_MS};
  width: 585px;
  z-index: ${ZIndex.LAYER_1};
`;

export const StyledDescriptionField = styled(Textarea)`
  background: transparent;
  border: hidden;
  font-size: 20px;
  max-height: 180px;
  position: relative;
  width: calc(100% - 20px) !important;

  &:hover {
    filter: brightness(90%);
  }
`;

export const StyledIconRow = styled(Flex)`
  align-items: center;
  gap: 30px;
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
  padding-top: 18px;
`;

export const StyledTitleField = styled(Textarea)`
  background: transparent;
  height: 40px;
  font-size: 35px;
  &:hover {
    filter: brightness(90%);
  }
`;
