import React from "react";
import { Priorities, Priority } from "@core/constants/core.constants";
import { JustifyContent } from "@web/components/Flex/styled";
import { colorByPriority } from "@web/common/styles/theme.util";
import { PriorityButton } from "@web/components/Button/styled";

import { StyledPriorityFlex } from "./styled";
import { SetEventFormField } from "../types";

interface Props {
  priority: Priority;
  onSetEventField: SetEventFormField;
}

export const PrioritySection: React.FC<Props> = ({
  onSetEventField,
  priority,
}) => {
  return (
    <StyledPriorityFlex justifyContent={JustifyContent.SPACE_BETWEEN}>
      <PriorityButton
        bordered={priority === Priorities.WORK}
        color={colorByPriority.work}
        onClick={() => {
          onSetEventField("priority", Priorities.WORK);
        }}
        onFocus={() => onSetEventField("priority", Priorities.WORK)}
        role="tab"
        tabIndex={0}
        title="Doing your best work"
      >
        Work
      </PriorityButton>

      <PriorityButton
        bordered={priority === Priorities.SELF}
        color={colorByPriority.self}
        onClick={() => onSetEventField("priority", Priorities.SELF)}
        onFocus={() => onSetEventField("priority", Priorities.SELF)}
        role="tab"
        tabIndex={0}
        title="Nurturing your authentic self"
      >
        Self
      </PriorityButton>

      <PriorityButton
        bordered={priority === Priorities.RELATIONS}
        color={colorByPriority.relationships}
        onClick={() => {
          onSetEventField("priority", Priorities.RELATIONS);
        }}
        onFocus={() => onSetEventField("priority", Priorities.RELATIONS)}
        role="tab"
        tabIndex={0}
        title="Connecting with others"
      >
        Relationships
      </PriorityButton>
    </StyledPriorityFlex>
  );
};
