import React, { useState } from "react";
import { Popover } from "react-tiny-popover";
import { Priorities, Priority } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { colorNameByPriority } from "@web/common/styles/colors";
import { JustifyContent } from "@web/components/Flex/styled";
import { Button } from "@web/components/Button";

import { StyledPriorityFlex, StyledToolTipContainer } from "./styled";

interface Props {
  priority: Priority;
  onSetEventField: () => React.SetStateAction<Schema_Event>;
}

export const PrioritySection: React.FC<Props> = ({
  onSetEventField,
  priority,
}) => {
  const [isRelationsTooltipOpen, setIsRelationsTooltipOpen] = useState(true);

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
      >
        Self
      </Button>

      <Popover
        isOpen={isRelationsTooltipOpen}
        positions={["right"]}
        padding={10}
        content={
          <StyledToolTipContainer>
            <h1>its open yo</h1>
          </StyledToolTipContainer>
        }
      >
        <Button
          bordered={priority === Priorities.RELATIONS}
          color={colorNameByPriority.relationships}
          onClick={() => {
            onSetEventField("priority", Priorities.RELATIONS);
            setIsRelationsTooltipOpen(false);
          }}
          onMouseEnter={() => setIsRelationsTooltipOpen(true)}
          onMouseLeave={() => setIsRelationsTooltipOpen(false)}
          onFocus={() => onSetEventField("priority", Priorities.RELATIONS)}
          role="tab"
          tabIndex={0}
        >
          Relationships
        </Button>
      </Popover>
    </StyledPriorityFlex>
  );
};
