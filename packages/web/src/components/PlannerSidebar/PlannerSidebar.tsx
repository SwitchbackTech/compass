import { type HTMLAttributes } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { PlannerAccountSummary } from "./PlannerAccountSummary/PlannerAccountSummary";
import { PlannerMonthPicker } from "./PlannerMonthPicker/PlannerMonthPicker";
import { PlannerSidebarActions } from "./PlannerSidebarActions/PlannerSidebarActions";
import { ShortcutsOverlay } from "./ShortcutsOverlay/ShortcutsOverlay";
import { SomedayEventSections } from "./SomedayEventSections/SomedayEventSections";

interface Props extends HTMLAttributes<HTMLDivElement> {
  calendarDate: Dayjs;
  monthsShown?: number;
  isShortcutsOpen: boolean;
  onCloseShortcuts: () => void;
  onToggleShortcuts: () => void;
  onSelectDate: (date: Dayjs) => void;
  onToggleSidebar?: () => void;
  shortcutSections: ShortcutOverlaySection[];
  showSomedayEventSections?: boolean;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}

export function PlannerSidebar({
  calendarDate,
  monthsShown = 1,
  isShortcutsOpen,
  onCloseShortcuts,
  onToggleShortcuts,
  onSelectDate,
  onToggleSidebar,
  shortcutSections,
  showSomedayEventSections = true,
  viewEnd,
  viewStart,
  ...props
}: Props) {
  return (
    <aside
      {...props}
      aria-label="Planner sidebar"
      className="relative flex h-full w-[285px] min-w-[285px] flex-col overflow-hidden border-border-primary border-r bg-panel-bg pt-5 text-panel-text"
      id={ID_SIDEBAR}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-5 [scrollbar-gutter:stable]">
        <PlannerMonthPicker
          monthsShown={monthsShown}
          onSelectDate={onSelectDate}
          onToggleSidebar={onToggleSidebar}
          selectedDate={calendarDate}
        />

        {showSomedayEventSections ? (
          <section aria-label="Someday events">
            <SomedayEventSections
              calendarDate={calendarDate}
              viewEnd={viewEnd}
              viewStart={viewStart}
            />
          </section>
        ) : null}
      </div>

      <PlannerAccountSummary />

      <PlannerSidebarActions
        isShortcutsOpen={isShortcutsOpen}
        onToggleShortcuts={onToggleShortcuts}
      />

      <ShortcutsOverlay
        isOpen={isShortcutsOpen}
        onClose={onCloseShortcuts}
        sections={shortcutSections}
      />
    </aside>
  );
}
