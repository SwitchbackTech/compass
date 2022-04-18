import React, { useState } from "react";
import { usePopper } from "react-popper";
import { Priorities, Priority } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { colorNameByPriority } from "@web/common/styles/colors";
import { JustifyContent } from "@web/components/Flex/styled";
import { Button } from "@web/components/Button";

import { StyledPriorityFlex, StyledToolTip } from "./styled";

interface Props {
  priority: Priority;
  onSetEventField: () => React.SetStateAction<Schema_Event>;
}

export const PrioritySection: React.FC<Props> = ({
  onSetEventField,
  priority,
}) => {
  const [isRelationsTooltipOpen, setIsRelationsTooltipOpen] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "bottom",
  });
  //   const popperStyles = { ...styles.popper, zIndex: 2 }; // $$
  const popperStyles = { ...styles.popper };

  return (
    <StyledPriorityFlex justifyContent={JustifyContent.SPACE_BETWEEN}>
      <Button
        bordered={priority === Priorities.WORK}
        color={colorNameByPriority.work}
        onClick={() => onSetEventField("priority", Priorities.WORK)}
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

      <Button
        bordered={priority === Priorities.RELATIONS}
        color={colorNameByPriority.relationships}
        onClick={() => onSetEventField("priority", Priorities.RELATIONS)}
        onMouseEnter={() => setIsRelationsTooltipOpen(true)}
        onMouseLeave={() => setIsRelationsTooltipOpen(false)}
        onFocus={() => onSetEventField("priority", Priorities.RELATIONS)}
        ref={setReferenceElement}
        role="tab"
        tabIndex={0}
      >
        Relationships
      </Button>
      <div ref={setPopperElement} style={popperStyles} {...attributes.popper}>
        {isRelationsTooltipOpen && <StyledToolTip>its open</StyledToolTip>}
      </div>
    </StyledPriorityFlex>
  );
};
