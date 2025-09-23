import React from "react";
import { Priorities, Priority } from "@core/constants/core.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import {
  PriorityCircle,
  TooltipText,
  TooltipWrapper,
} from "@web/components/ContextMenu/styled";
import { JustifyContent } from "@web/components/Flex/styled";
import { SetEventFormField } from "../types";
import { StyledPriorityFlex } from "./styled";

interface Props {
  priority: Priority;
  onSetEventField: SetEventFormField;
}

export const PrioritySection: React.FC<Props> = ({
  onSetEventField,
  priority,
}) => {
  return (
    <StyledPriorityFlex>
      <TooltipWrapper>
        <PriorityCircle
          color={colorByPriority.work}
          selected={priority === Priorities.WORK}
          onClick={() => {
            onSetEventField({ priority: Priorities.WORK });
          }}
          onFocus={() => onSetEventField({ priority: Priorities.WORK })}
          role="tab"
          tabIndex={0}
        />
        <TooltipText>Work</TooltipText>
      </TooltipWrapper>

      <TooltipWrapper>
        <PriorityCircle
          color={colorByPriority.self}
          selected={priority === Priorities.SELF}
          onClick={() => onSetEventField({ priority: Priorities.SELF })}
          onFocus={() => onSetEventField({ priority: Priorities.SELF })}
          role="tab"
          tabIndex={0}
        />
        <TooltipText>Self</TooltipText>
      </TooltipWrapper>

      <TooltipWrapper>
        <PriorityCircle
          color={colorByPriority.relationships}
          selected={priority === Priorities.RELATIONS}
          onClick={() => {
            onSetEventField({ priority: Priorities.RELATIONS });
          }}
          onFocus={() => onSetEventField({ priority: Priorities.RELATIONS })}
          role="tab"
          tabIndex={0}
        />
        <TooltipText>Relationships</TooltipText>
      </TooltipWrapper>
    </StyledPriorityFlex>
  );
};
