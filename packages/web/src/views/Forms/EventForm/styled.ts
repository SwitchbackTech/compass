import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import { Flex } from "@web/components/Flex";
import { Input } from "@web/components/Input";
import { Textarea } from "@web/components/Textarea";
import { StyledFormProps } from "./types";

// Extract Priority type from StyledFormProps
type Priority = NonNullable<StyledFormProps["priority"]>;

interface SomedayFormProps extends StyledFormProps {
  x?: number;
  y?: number;
}

interface StyledTitleProps {
  underlineColor?: string;
}

interface StyledEventFormProps extends StyledFormProps {
  isOpen: boolean;
}

export const StyledEventForm = styled.form<StyledEventFormProps>`
  background: ${({ priority }) => {
    if (!priority) return "transparent";
    return hoverColorByPriority[priority] || "transparent";
  }};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  box-shadow: 0px 5px 5px ${({ theme }) => theme.color.shadow.default};
  font-size: 20px;
  padding: 18px 20px;
  transition: ${({ theme }) => theme.transition.default};
  width: 585px;
  z-index: ${ZIndex.LAYER_1};
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  display: ${({ isOpen }) => (isOpen ? "block" : "none")};
`;

export const StyledTitle = styled(Input)<StyledTitleProps>`
  background: transparent;
  font-size: ${({ theme }) => theme.text.size["5xl"]};
  font-weight: 600;
  width: 100%;
  border: none;
  border-bottom: 2px solid
    ${({ underlineColor }) => underlineColor || "transparent"};

  &:hover {
    filter: brightness(90%);
  }

  &:focus {
    outline: none;
    border-bottom-color: ${({ underlineColor }) =>
      underlineColor || "transparent"};
  }
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

  &:focus {
    outline: none;
  }
`;

export const StyledIconRow = styled(Flex)`
  align-items: center;
  gap: 30px;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

export const StyledSubmitRow = styled(Flex)`
  align-items: center;
  justify-content: flex-end;
  padding-top: 18px;
  gap: 16px;
`;
