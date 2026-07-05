import type React from "react";
import { Priorities, type Priority } from "@core/constants/core.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import { colorByPriority } from "@web/common/styles/theme.util";
import { type SetEventFormField } from "../types";

interface Props {
  priority: Priority;
  onSetEventField: SetEventFormField;
}

export const PrioritySection: React.FC<Props> = ({
  onSetEventField,
  priority,
}) => {
  const priorities = [
    { color: colorByPriority.work, label: "Work", value: Priorities.WORK },
    { color: colorByPriority.self, label: "Self", value: Priorities.SELF },
    {
      color: colorByPriority.relationships,
      label: "Relationships",
      value: Priorities.RELATIONS,
    },
  ];

  return (
    <div className="my-[15px] flex items-start gap-2.5">
      {priorities.map((item) => (
        <div
          className="group relative flex flex-col items-center"
          key={item.value}
        >
          <button
            aria-label={`Set priority to ${item.label}`}
            aria-selected={priority === item.value}
            className="c-context-priority-circle"
            data-selected={priority === item.value}
            onClick={() => onSetEventField({ priority: item.value })}
            onFocus={() => onSetEventField({ priority: item.value })}
            role="tab"
            style={{ "--priority-color": item.color } as CSSVariables}
            type="button"
          />
          <span className="c-context-tooltip">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
