import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import { PriorityButton } from "@web/components/Button/styled";
import { Flex } from "@web/components/Flex";
import { Input } from "@web/components/Input/Input";
import { Textarea } from "@web/components/Textarea";
import { EVENT_WIDTH_MINIMUM } from "@web/views/Calendar/layout.constants";
import { StyledFormProps } from "./types";

interface SomedayFormProps extends StyledFormProps {
  x?: number;
  y?: number;
}

export const StyledEventForm = styled.form<SomedayFormProps>`
  background: ${({ priority }) => hoverColorByPriority[priority]};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  box-shadow: 0px 5px 5px ${({ theme }) => theme.color.shadow.default};
  font-size: 20px;
  padding: 18px 20px;
  transition: ${({ theme }) => theme.transition.default};
  z-index: ${ZIndex.LAYER_1};
`;

export const StyledDescription = styled(Textarea)`
  background: transparent;
  border: hidden;
  font-size: ${({ theme }) => theme.text.size.xxl};
  font-weight: ${({ theme }) => theme.text.weight.regular};
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
  margin-bottom: 10px;
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

export const StyledTitle = styled(Input)`
  background: transparent;
  font-size: ${({ theme }) => theme.text.size["5xl"]};
  font-weight: 600;
  transition: ${({ theme }) => theme.transition.default};

  &:hover {
    filter: brightness(90%);
    background-color: rgba(0, 0, 0, 0.05);
  }
`;
