import { forwardRef } from "react";
import { FloatingPortal, useMergeRefs } from "@floating-ui/react";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { darken, isDark } from "@core/util/color.utils";
import { ZIndex } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { getAgendaEventTime } from "@web/views/Day/util/agenda/agenda.util";
import { useAgendaEventMenu } from "./context/useAgendaEventMenu";

export const AgendaEventMenuContent = forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & {
    event: Schema_Event;
    style?: React.CSSProperties;
  }
>(function AgendaEventMenuContent({ event, ...props }, propRef) {
  const context = useAgendaEventMenu();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);

  const priority = event.priority || Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[priority];
  const darkPriorityColor = darken(priorityColor);
  const shouldUseLightText = !isDark(darkPriorityColor);

  let timeDisplay = "";
  if (!event.isAllDay) {
    const startTime = event.startDate
      ? getAgendaEventTime(event.startDate)
      : "";
    const endTime = event.endDate ? getAgendaEventTime(event.endDate) : "";
    timeDisplay = startTime && endTime ? `${startTime} - ${endTime}` : "";
  }
  // All-day events: timeDisplay stays empty (no dates shown)

  return (
    <FloatingPortal>
      {context.open && (
        <div
          ref={ref}
          role="dialog"
          aria-labelledby="event-title"
          aria-describedby={event.description ? "event-description" : undefined}
          className="z-50 max-w-80 min-w-64 rounded-lg p-4 shadow-lg"
          style={{
            backgroundColor: darkPriorityColor,
            left: context.x ?? 0,
            position: context.strategy,
            top: context.y ?? 0,
            visibility: context.x == null ? "hidden" : "visible",
            zIndex: ZIndex.MAX,
            ...props.style,
          }}
          {...context.getFloatingProps(props)}
        >
          <div className="space-y-2">
            <h3
              id="event-title"
              className={`text-sm font-semibold ${
                shouldUseLightText ? "text-text-lighter" : "text-text-dark"
              }`}
            >
              {event.title || "Untitled Event"}
            </h3>
            {timeDisplay && (
              <time
                className={`text-xs font-medium ${
                  shouldUseLightText ? "text-text-lighter/90" : "text-text-dark"
                }`}
                dateTime={event.startDate}
              >
                {timeDisplay}
              </time>
            )}
            {event.description && (
              <p
                id="event-description"
                className={`text-xs leading-relaxed ${
                  shouldUseLightText ? "text-text-lighter/85" : "text-text-dark"
                }`}
              >
                {event.description}
              </p>
            )}
          </div>
        </div>
      )}
    </FloatingPortal>
  );
});
