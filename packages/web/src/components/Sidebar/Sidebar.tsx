import { type HTMLAttributes, type ReactNode } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { CalendarList } from "./CalendarList/CalendarList";
import { MonthPicker } from "./MonthPicker/MonthPicker";
import { ShortcutsOverlay } from "./ShortcutsOverlay/ShortcutsOverlay";
import { SidebarActions } from "./SidebarActions/SidebarActions";
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
  isEventDetailsOpen?: boolean;
  monthsShown?: number;
  isShortcutsOpen: boolean;
  onCloseShortcuts: () => void;
  onToggleShortcuts: () => void;
  onSelectDate: (date: Dayjs) => void;
  shortcutSections: ShortcutOverlaySection[];
  shortcutsViewLabel?: string;
}

type SidebarDependencies = {
  CalendarList: typeof CalendarList;
  MonthPicker: typeof MonthPicker;
  TasksRemovalNotice: typeof TasksRemovalNotice;
  UpNextCard: typeof UpNextCard;
  SidebarActions: typeof SidebarActions;
  ShortcutsOverlay: typeof ShortcutsOverlay;
};

export function createSidebar({
  CalendarList: CalendarListComponent,
  MonthPicker: MonthPickerComponent,
  TasksRemovalNotice: TasksRemovalNoticeComponent,
  UpNextCard: UpNextCardComponent,
  SidebarActions: SidebarActionsComponent,
  ShortcutsOverlay: ShortcutsOverlayComponent,
}: SidebarDependencies) {
  return function Sidebar({
    calendarDate,
    eventDetails,
    isEventDetailsOpen = false,
    monthsShown = 1,
    isShortcutsOpen,
    onCloseShortcuts,
    onToggleShortcuts,
    onSelectDate,
    shortcutSections,
    shortcutsViewLabel,
    ...props
  }: SidebarProps) {
    const showEventDetails = Boolean(eventDetails) && isEventDetailsOpen;

    return (
      <SidebarShell
        {...props}
        isShortcutsOpen={isShortcutsOpen}
        onCloseShortcuts={onCloseShortcuts}
        onToggleShortcuts={onToggleShortcuts}
        shortcutSections={shortcutSections}
        shortcutsViewLabel={shortcutsViewLabel}
        SidebarActionsComponent={SidebarActionsComponent}
        ShortcutsOverlayComponent={ShortcutsOverlayComponent}
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
            <MonthPickerComponent
              monthsShown={monthsShown}
              onSelectDate={onSelectDate}
              selectedDate={calendarDate}
            />
            <UpNextCardComponent />
            <CalendarListComponent />
            <TasksRemovalNoticeComponent />
          </div>
        )}
      </SidebarShell>
    );
  };
}

export const Sidebar = createSidebar({
  CalendarList,
  MonthPicker,
  TasksRemovalNotice,
  UpNextCard,
  SidebarActions,
  ShortcutsOverlay,
});
