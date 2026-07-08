import { type HTMLAttributes } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { PlannerAccountSummary } from "./PlannerAccountSummary/PlannerAccountSummary";
import { PlannerMonthPicker } from "./PlannerMonthPicker/PlannerMonthPicker";
import { PlannerSidebarActions } from "./PlannerSidebarActions/PlannerSidebarActions";
import { ShortcutsOverlay } from "./ShortcutsOverlay/ShortcutsOverlay";
import { SomedayEventSections } from "./SomedayEventSections/SomedayEventSections";

export interface PlannerSidebarProps extends HTMLAttributes<HTMLDivElement> {
  calendarDate: Dayjs;
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
  PlannerMonthPicker: typeof PlannerMonthPicker;
  PlannerSidebarActions: typeof PlannerSidebarActions;
  ShortcutsOverlay: typeof ShortcutsOverlay;
  SomedayEventSections: typeof SomedayEventSections;
};

export function createPlannerSidebar({
  PlannerAccountSummary: PlannerAccountSummaryComponent,
  PlannerMonthPicker: PlannerMonthPickerComponent,
  PlannerSidebarActions: PlannerSidebarActionsComponent,
  ShortcutsOverlay: ShortcutsOverlayComponent,
  SomedayEventSections: SomedayEventSectionsComponent,
}: PlannerSidebarDependencies) {
  return function PlannerSidebar({
    calendarDate,
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
    return (
      <aside
        {...props}
        aria-label="Planner sidebar"
        className="relative flex h-full w-71.25 min-w-71.25 flex-col overflow-hidden border-border-primary border-r bg-panel-bg pt-5 text-panel-text"
        id={ID_SIDEBAR}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-5 [scrollbar-gutter:stable]">
          <PlannerMonthPickerComponent
            monthsShown={monthsShown}
            onSelectDate={onSelectDate}
            onToggleSidebar={onToggleSidebar}
            selectedDate={calendarDate}
          />

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
  PlannerMonthPicker,
  PlannerSidebarActions,
  ShortcutsOverlay,
  SomedayEventSections,
});
