import { type HTMLAttributes, type ReactNode } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { PlannerCalendarList } from "./PlannerCalendarList/PlannerCalendarList";
import { PlannerMonthPicker } from "./PlannerMonthPicker/PlannerMonthPicker";
import { PlannerSidebarActions } from "./PlannerSidebarActions/PlannerSidebarActions";
import { ShortcutsOverlay } from "./ShortcutsOverlay/ShortcutsOverlay";
import { TasksRemovalNotice } from "./TasksRemovalNotice/TasksRemovalNotice";
import { UpNextCard } from "./UpNextCard/UpNextCard";

export interface PlannerSidebarProps extends HTMLAttributes<HTMLDivElement> {
  calendarDate: Dayjs;
  /**
   * The view's event-details form. Shown in place of the sidebar's normal
   * body while the draft store says a grid event form is open, so event
   * editing always happens in the sidebar.
   */
  eventDetails?: ReactNode;
  isEventDetailsOpen?: boolean;
  monthsShown?: number;
  isShortcutsOpen: boolean;
  onCloseShortcuts: () => void;
  onToggleShortcuts: () => void;
  onSelectDate: (date: Dayjs) => void;
  onToggleSidebar?: () => void;
  shortcutSections: ShortcutOverlaySection[];
  shortcutsViewLabel?: string;
}

type PlannerSidebarDependencies = {
  PlannerCalendarList: typeof PlannerCalendarList;
  PlannerMonthPicker: typeof PlannerMonthPicker;
  PlannerSidebarActions: typeof PlannerSidebarActions;
  ShortcutsOverlay: typeof ShortcutsOverlay;
  TasksRemovalNotice: typeof TasksRemovalNotice;
  UpNextCard: typeof UpNextCard;
};

export function createPlannerSidebar({
  PlannerCalendarList: PlannerCalendarListComponent,
  PlannerMonthPicker: PlannerMonthPickerComponent,
  PlannerSidebarActions: PlannerSidebarActionsComponent,
  ShortcutsOverlay: ShortcutsOverlayComponent,
  TasksRemovalNotice: TasksRemovalNoticeComponent,
  UpNextCard: UpNextCardComponent,
}: PlannerSidebarDependencies) {
  return function PlannerSidebar({
    calendarDate,
    eventDetails,
    isEventDetailsOpen = false,
    monthsShown = 1,
    isShortcutsOpen,
    onCloseShortcuts,
    onToggleShortcuts,
    onSelectDate,
    onToggleSidebar,
    shortcutSections,
    shortcutsViewLabel,
    ...props
  }: PlannerSidebarProps) {
    const showEventDetails = Boolean(eventDetails) && isEventDetailsOpen;

    return (
      <aside
        {...props}
        aria-label="Planner sidebar"
        className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-panel-bg pt-5 text-panel-text"
        id={ID_SIDEBAR}
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
            <PlannerMonthPickerComponent
              monthsShown={monthsShown}
              onSelectDate={onSelectDate}
              onToggleSidebar={onToggleSidebar}
              selectedDate={calendarDate}
            />
            <UpNextCardComponent />
            <PlannerCalendarListComponent />
            <TasksRemovalNoticeComponent />
          </div>
        )}

        <PlannerSidebarActionsComponent
          isShortcutsOpen={isShortcutsOpen}
          onToggleShortcuts={onToggleShortcuts}
        />

        <ShortcutsOverlayComponent
          isOpen={isShortcutsOpen}
          onClose={onCloseShortcuts}
          sections={shortcutSections}
          viewLabel={shortcutsViewLabel}
        />
      </aside>
    );
  };
}

export const PlannerSidebar = createPlannerSidebar({
  PlannerCalendarList,
  PlannerMonthPicker,
  PlannerSidebarActions,
  ShortcutsOverlay,
  TasksRemovalNotice,
  UpNextCard,
});
