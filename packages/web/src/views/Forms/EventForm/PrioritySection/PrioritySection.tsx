import type React from "react";
import { useMemo, useRef } from "react";
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
  const priorities = useMemo(
    () => [
      { color: colorByPriority.work, label: "Work", value: Priorities.WORK },
      { color: colorByPriority.self, label: "Self", value: Priorities.SELF },
      { color: colorByPriority.relationships,label: "Relationships",value: Priorities.RELATIONS },
    ],
    [],
  );

  const selectedIndex = useMemo(() => {
    const idx = priorities.findIndex((p) => p.value === priority);
    return idx === -1 ? 0 : idx;
  }, [priorities, priority]);

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectIndex = (idx: number) => {
    const normalized =
      ((idx % priorities.length) + priorities.length) % priorities.length;
    onSetEventField({ priority: priorities[normalized].value });
    buttonRefs.current[normalized]?.focus();
  };

  return (
    <div className="my-[15px] flex items-start gap-2.5">
      {priorities.map((item) => (
        <div
          className="group relative flex flex-col items-center"
          key={item.value}
        >
          <button
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            aria-label={`Priority: ${item.label}`}
            aria-checked={priority === item.value}
            className="c-context-priority-circle"
            data-selected={priority === item.value}
            onClick={() => onSetEventField({ priority: item.value })}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                e.stopPropagation();
                selectIndex(idx - 1);
                return;
              }

              if (e.key === "ArrowRight") {
                e.preventDefault();
                e.stopPropagation();
                selectIndex(idx + 1);
                return;
              }
            }}
            role="radio"
            tabIndex={idx === selectedIndex ? 0 : -1}
            style={{ "--priority-color": item.color } as CSSVariables}
            type="button"
          />
          <span className="c-context-tooltip">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
