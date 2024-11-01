import styled from "styled-components";
import { EVENT_WIDTH_MINIMUM } from "@web/views/Calendar/layout.constants";
import { ZIndex } from "@web/common/constants/web.constants";
import { Flex } from "@web/components/Flex";
import { Textarea } from "@web/components/Textarea";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import { PriorityButton } from "@web/components/Button/styled";

import { StyledFormProps } from "./types";

export const FORM_TIME_SIZE = 17;

interface SomedayFormProps extends StyledFormProps {
  x?: number;
  y?: number;
}

export const StyledEventForm = styled.form<SomedayFormProps>`
  background: ${({ priority }) => hoverColorByPriority[priority]};
  border-radius: 4px;
  box-shadow: 0px 5px 5px ${({ theme }) => theme.color.shadow.default};
  font-size: 20px;
  padding: 18px 20px;
  transition: ${({ theme }) => theme.transition.default};
  width: 585px;
  z-index: ${ZIndex.LAYER_1};
`;

export const StyledDescription = styled(Textarea)`
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

export const StyledSubmitButton = styled(PriorityButton)`
  border: 2px solid;
  margin-top: 15px;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
`;

export const StyledSubmitRow = styled(Flex)`
  align-items: right;
  justify-content: end;
  padding-top: 18px;
`;

export const StyledTitle = styled(Textarea)`
  background: transparent;
  height: 40px;
  font-size: 35px;
  &:hover {
    filter: brightness(90%);
  }
`;
