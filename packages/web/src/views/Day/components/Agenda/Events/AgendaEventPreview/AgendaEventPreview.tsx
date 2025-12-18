import {
  FloatingPortal,
  UseInteractionsReturn,
  useFloating,
} from "@floating-ui/react";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { colorByPriority } from "@web/common/styles/theme.util";
import { useDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { getAgendaEventTime } from "@web/views/Day/util/agenda/agenda.util";

export function AgendaEventPreview({
  floating,
  interactions,
}: {
  floating: ReturnType<typeof useFloating>;
  interactions: UseInteractionsReturn;
}) {
  const draft = useDraft();
  const nodeId = useFloatingNodeIdAtCursor();
  const floatingContextOpen = floating.context.open;
  const maxZIndex = useGridMaxZIndex();
  const isOpenAtCursor = nodeId === CursorItem.EventPreview;
  const open = floatingContextOpen && isOpenAtCursor && !!draft;
  const priority = draft?.priority || Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[priority];
  const darkPriorityColor = darken(priorityColor);
  const shouldUseLightText = isDark(darkPriorityColor);

  const timeDisplay =
    !draft?.isAllDay && draft?.startDate && draft?.endDate
      ? `${getAgendaEventTime(draft.startDate)} - ${getAgendaEventTime(draft.endDate)}`
      : "";

  if (!open) return null;

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
          zIndex: maxZIndex + 1,
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
