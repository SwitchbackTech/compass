import { type KeyboardEvent, type Ref } from "react";
import { type Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import {
  gridColorByPriority,
  gridHoverColorByPriority,
} from "@web/common/styles/theme.util";
import { type Actions_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarActions";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { SomedayEventRectangle } from "../SomedayEventContainer/SomedayEventRectangle";
import {
  SOMEDAY_EVENT_ROW_HEIGHT,
  SOMEDAY_EVENT_ROW_VERTICAL_MARGIN,
} from "./someday-event.constants";

interface Props {
  calendarIdentity?: CalendarCardIdentity | null;
  category: SomedayInteractionCategory;
  event: Event;
  status: {
    isDrafting: boolean;
    isDragging: boolean;
  };
  onBlur: () => void;
  onClick: () => void;
  onFocus: () => void;
  onMigrate: Actions_Sidebar["onMigrate"];
  priority: Priorities;
  interactionRef: Ref<HTMLDivElement>;
  formProps: Props_DraftForm;
}
export const SomedayEvent = ({
  calendarIdentity = null,
  category,
  event,
  status,
  onBlur,
  onClick,
  onFocus,
  onMigrate,
  priority,
  interactionRef,
  formProps,
}: Props) => {
  const { isDrafting, isDragging } = status;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();
    onClick();
  };

  const baseColor = gridColorByPriority[priority];
  const hoverColor = gridHoverColorByPriority[priority];
  const tint = (color: string, percent: number) =>
    `color-mix(in srgb, ${color} ${percent}%, transparent)`;
  // Explicit only when there's a calendar to name - otherwise this falls
  // through to the existing name-from-content computation (title +
  // migrate-button labels), unchanged from before this prop existed.
  // Priority remains the row's fill; the accent + this label are the only
  // calendar signal, and the name (never color alone) is what makes it
  // accessible (A9).
  const title = event.content.kind === "details" ? event.content.title : "";
  const accessibleLabel = calendarIdentity
    ? `${title || "Untitled event"}, ${calendarIdentity.name} calendar`
    : undefined;
  const somedayEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event.id,
    "aria-hidden": isDragging || undefined,
    "aria-label": accessibleLabel,
    onBlur,
    onClick,
    onFocus,
    onKeyDown: handleKeyDown,
    role: "button",
    ref: interactionRef,
    tabIndex: isDragging ? -1 : 0,
  };

  return (
    <div
      {...somedayEventProps}
      className="group relative w-full cursor-grab rounded-xs bg-(--someday-event-bg) px-2 py-0.75 text-text-dark text-xs transition-[background-color_.2s,opacity_.12s,box-shadow_.2s] hover:cursor-pointer hover:bg-(--someday-event-hover-bg) focus-visible:outline-1 focus-visible:outline-accent-primary focus-visible:outline-offset-1 data-[dragging=true]:pointer-events-none data-[dragging=true]:cursor-grabbing data-[dragging=true]:opacity-0"
      data-dragging={isDragging}
      style={
        {
          "--someday-event-bg": isDrafting
            ? tint(baseColor, isDragging ? 45 : 35)
            : baseColor,
          "--someday-event-hover-bg": isDrafting
            ? tint(hoverColor, 25)
            : hoverColor,
          height: SOMEDAY_EVENT_ROW_HEIGHT,
          marginBlock: SOMEDAY_EVENT_ROW_VERTICAL_MARGIN,
        } as CSSVariables
      }
    >
      {calendarIdentity && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-xs"
          style={{ backgroundColor: calendarIdentity.backgroundColor }}
        />
      )}
      <SomedayEventRectangle
        category={category}
        event={event}
        onMigrate={onMigrate}
        formProps={formProps}
      />
    </div>
  );
};
