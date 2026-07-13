import { type HTMLAttributes, type ReactNode } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import {
  selectIsDraftingSomeday,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { PlannerAccountSummary } from "./PlannerAccountSummary/PlannerAccountSummary";
import { PlannerCalendarList } from "./PlannerCalendarList/PlannerCalendarList";
import { PlannerMonthPicker } from "./PlannerMonthPicker/PlannerMonthPicker";
import { PlannerSidebarActions } from "./PlannerSidebarActions/PlannerSidebarActions";
import { ShortcutsOverlay } from "./ShortcutsOverlay/ShortcutsOverlay";
import { SomedayEventSections } from "./SomedayEventSections/SomedayEventSections";

export interface PlannerSidebarProps extends HTMLAttributes<HTMLDivElement> {
  calendarDate: Dayjs;
  /**
   * The view's event-details form. Shown in place of the sidebar's normal
   * body while the draft store says a grid event form is open, so event
   * editing always happens in the sidebar.
   */
  eventDetails?: ReactNode;
  monthsShown?: number;
  isShortcutsOpen: boolean;
  onCloseShortcuts: () => void;
  onToggleShortcuts: () => void;
  onSelectDate: (date: Dayjs) => void;
  onToggleSidebar?: () => void;
  shortcutSections: ShortcutOverlaySection[];
  shortcutsViewLabel?: string;
  showSomedayEventSections?: boolean;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}

type PlannerSidebarDependencies = {
  PlannerAccountSummary: typeof PlannerAccountSummary;
  PlannerCalendarList: typeof PlannerCalendarList;
  PlannerMonthPicker: typeof PlannerMonthPicker;
  PlannerSidebarActions: typeof PlannerSidebarActions;
  ShortcutsOverlay: typeof ShortcutsOverlay;
  SomedayEventSections: typeof SomedayEventSections;
};

export function createPlannerSidebar({
  PlannerAccountSummary: PlannerAccountSummaryComponent,
  PlannerCalendarList: PlannerCalendarListComponent,
  PlannerMonthPicker: PlannerMonthPickerComponent,
  PlannerSidebarActions: PlannerSidebarActionsComponent,
  ShortcutsOverlay: ShortcutsOverlayComponent,
  SomedayEventSections: SomedayEventSectionsComponent,
}: PlannerSidebarDependencies) {
  return function PlannerSidebar({
    calendarDate,
    eventDetails,
    monthsShown = 1,
    isShortcutsOpen,
    onCloseShortcuts,
    onToggleShortcuts,
    onSelectDate,
    onToggleSidebar,
    shortcutSections,
    shortcutsViewLabel,
    showSomedayEventSections = true,
    viewEnd,
    viewStart,
    ...props
  }: PlannerSidebarProps) {
    // The someday form renders inline inside the someday sections, so a
    // someday draft keeps the normal sidebar body.
    const isGridFormOpen = useDraftStore(selectIsEventFormOpen);
    const isDraftingSomeday = useDraftStore(selectIsDraftingSomeday);
    const showEventDetails =
      Boolean(eventDetails) && isGridFormOpen && !isDraftingSomeday;

    return (
      <aside
        {...props}
        aria-label="Planner sidebar"
        className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-panel-bg pt-5 text-panel-text"
        id={ID_SIDEBAR}
      >
        {showEventDetails ? (
          <section
            aria-label="Event details"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-5 [scrollbar-gutter:stable]"
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

            <PlannerCalendarListComponent />

            {showSomedayEventSections ? (
              <section aria-label="Someday events">
                <SomedayEventSectionsComponent
                  calendarDate={calendarDate}
                  viewEnd={viewEnd}
                  viewStart={viewStart}
                />
              </section>
            ) : null}
          </div>
        )}

        <PlannerAccountSummaryComponent />

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
  PlannerAccountSummary,
  PlannerCalendarList,
  PlannerMonthPicker,
  PlannerSidebarActions,
  ShortcutsOverlay,
  SomedayEventSections,
});
