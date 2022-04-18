import React from "react";
import { Priorities, Priority } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { colorNameByPriority } from "@web/common/styles/colors";
import { JustifyContent } from "@web/components/Flex/styled";
import { Button } from "@web/components/Button";

import { StyledPriorityFlex } from "./styled";

interface Props {
  priority: Priority;
  onSetEventField: () => React.SetStateAction<Schema_Event>;
}

export const PrioritySection: React.FC<Props> = ({
  onSetEventField,
  priority,
}) => {
  return (
    <StyledPriorityFlex justifyContent={JustifyContent.SPACE_BETWEEN}>
      <Button
        bordered={priority === Priorities.WORK}
        color={colorNameByPriority.work}
        onClick={() => {
          onSetEventField("priority", Priorities.WORK);
        }}
        onFocus={() => onSetEventField("priority", Priorities.WORK)}
        role="tab"
        tabIndex={0}
        title="Doing your best work"
      >
        Work
      </Button>

      <Button
        bordered={priority === Priorities.SELF}
        color={colorNameByPriority.self}
        onClick={() => onSetEventField("priority", Priorities.SELF)}
        onFocus={() => onSetEventField("priority", Priorities.SELF)}
        role="tab"
        tabIndex={0}
        title="Nurturing your authentic self"
      >
        Self
      </Button>

      <Button
        bordered={priority === Priorities.RELATIONS}
        color={colorNameByPriority.relationships}
        onClick={() => {
          onSetEventField("priority", Priorities.RELATIONS);
        }}
        onFocus={() => onSetEventField("priority", Priorities.RELATIONS)}
        role="tab"
        tabIndex={0}
        title="Connecting with others"
      >
        Relationships
      </Button>
    </StyledPriorityFlex>
  );
};
