import { FloatingPortal } from "@floating-ui/react";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { colorByPriority } from "@web/common/styles/theme.util";
import { maxAgendaZIndex$ } from "@web/common/utils/dom/grid-organization.util";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { getAgendaEventTime } from "@web/views/Day/util/agenda/agenda.util";

export function AgendaEventPreview() {
  const context = useDraftContextV2();
  const zIndex = maxAgendaZIndex$.getValue() + 1;
  const openAtCursor = useOpenAtCursor();
  const { draft } = context;
  const { nodeId, floating, interactions } = openAtCursor;
  const isOpenAtCursor = nodeId === CursorItem.EventPreview;

  const priority = draft?.priority || Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[priority];
  const darkPriorityColor = darken(priorityColor);
  const shouldUseLightText = isDark(darkPriorityColor);

  const timeDisplay =
    !draft?.isAllDay && draft?.startDate && draft?.endDate
      ? `${getAgendaEventTime(draft.startDate)} - ${getAgendaEventTime(draft.endDate)}`
      : "";

  if (!isOpenAtCursor || !draft) return null;

  return (
    <FloatingPortal>
      <div
        {...interactions.getFloatingProps()}
        ref={floating.refs.setFloating}
        role="dialog"
        aria-labelledby="event-title"
        aria-describedby={draft?.description ? "event-description" : undefined}
        className="z-50 max-w-80 min-w-64 rounded-lg p-4 shadow-lg"
        style={{
          ...floating.context.floatingStyles,
          backgroundColor: darkPriorityColor,
          zIndex,
        }}
      >
        <div className="space-y-2">
          <h3
            id="event-title"
            className={`text-sm font-semibold ${
              shouldUseLightText ? "text-text-lighter" : "text-text-dark"
            }`}
          >
            {draft?.title || "Untitled Event"}
          </h3>
          {timeDisplay && (
            <time
              className={`text-xs font-medium ${
                shouldUseLightText ? "text-text-lighter/90" : "text-text-dark"
              }`}
              dateTime={draft?.startDate}
            >
              {timeDisplay}
            </time>
          )}
          {draft?.description && (
            <p
              id="event-description"
              className={`text-xs leading-relaxed ${
                shouldUseLightText ? "text-text-lighter/85" : "text-text-dark"
              }`}
            >
              {draft?.description}
            </p>
          )}
        </div>
      </div>
    </FloatingPortal>
  );
}
