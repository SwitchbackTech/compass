import { type HTMLAttributes, type ReactNode } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { type ShortcutOverlaySection } from "@web/shortcuts/shortcuts-overlay.types";
import { CalendarList } from "./CalendarList/CalendarList";
import { MonthPicker } from "./MonthPicker/MonthPicker";
import { SidebarShell } from "./SidebarShell";
import { TasksRemovalNotice } from "./TasksRemovalNotice/TasksRemovalNotice";
import { UpNextCard } from "./UpNextCard/UpNextCard";

export interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  calendarDate: Dayjs;
  /**
   * The view's event-details form. Shown in place of the sidebar's normal
   * body while the draft store says a grid event form is open, so event
   * editing always happens in the sidebar.
   */
  eventDetails?: ReactNode;
  monthsShown?: number;
  onSelectDate: (date: Dayjs) => void;
  shortcutSections: ShortcutOverlaySection[];
  shortcutsViewLabel?: string;
}

export function Sidebar({
  calendarDate,
  eventDetails,
  monthsShown = 1,
  onSelectDate,
  shortcutSections,
  shortcutsViewLabel,
  ...props
}: SidebarProps) {
  const isEventFormOpen = useDraftStore(selectIsEventFormOpen);
  const showEventDetails = Boolean(eventDetails) && isEventFormOpen;

  return (
    <SidebarShell
      {...props}
      shortcutSections={shortcutSections}
      shortcutsViewLabel={shortcutsViewLabel}
    >
      {showEventDetails ? (
        // Scrolling and horizontal padding live inside the event form so
        // its pinned save footer can span the sidebar's full width.
        <section
          aria-label="Event details"
          className="flex min-h-0 flex-1 flex-col"
        >
          {eventDetails}
        </section>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-5 [scrollbar-gutter:stable]">
          <MonthPicker
            monthsShown={monthsShown}
            onSelectDate={onSelectDate}
            selectedDate={calendarDate}
          />
          <UpNextCard />
          <CalendarList />
          <TasksRemovalNotice />
        </div>
      )}
    </SidebarShell>
  );
}
