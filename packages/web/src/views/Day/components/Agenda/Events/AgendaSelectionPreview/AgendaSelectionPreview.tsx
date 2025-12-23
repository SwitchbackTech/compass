import { useMemo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";
import { getEventTimeFromPosition } from "@web/views/Day/util/agenda/agenda.util";

const MIN_SELECTION_HEIGHT = SLOT_HEIGHT; // Minimum height for selection preview

interface AgendaSelectionPreviewProps {
  startY: number;
  currentY: number;
}

export function AgendaSelectionPreview({
  startY,
  currentY,
}: AgendaSelectionPreviewProps) {
  const dateInView = useDateInView();

  const { top, height, timeDisplay } = useMemo(() => {
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);

    const startTime = getEventTimeFromPosition(minY, dateInView);
    const endTime = getEventTimeFromPosition(maxY, dateInView);

    const startPosition = getAgendaEventPosition(startTime.toDate());
    const endPosition = getAgendaEventPosition(endTime.toDate());
    const height = Math.max(MIN_SELECTION_HEIGHT, endPosition - startPosition);

    const formatTime = (time: Date) => {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const ampm = hours >= 12 ? "pm" : "am";
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;
    };

    const timeDisplay = `${formatTime(startTime.toDate())} - ${formatTime(endTime.toDate())}`;

    return {
      top: startPosition,
      height,
      timeDisplay,
    };
  }, [startY, currentY, dateInView]);

  const priority = Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[priority];

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 rounded"
      style={{
        top,
        height,
        backgroundColor: priorityColor,
        opacity: 0.5,
        zIndex: 10,
      }}
    >
      <div className="flex h-full items-center justify-center text-xs font-medium text-white">
        {timeDisplay}
      </div>
    </div>
  );
}
