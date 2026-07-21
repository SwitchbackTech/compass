import { useCallback, useEffect, useMemo, useState } from "react";
import { getCommandPalettePlaceholder } from "@web/common/constants/more.cmd.constants";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { useResponsiveLayout } from "@web/components/AuthenticatedLayout/useResponsiveLayout";
import { CalendarHeader } from "@web/components/CalendarHeader/CalendarHeader";
import { LifeCommandPalette } from "@web/components/CommandPalette/CommandPalette";
import { ResizableSidebarPanel } from "@web/components/Sidebar/ResizableSidebarPanel";
import { SidebarShell } from "@web/components/Sidebar/SidebarShell";
import { useSidebarShortcuts } from "@web/components/Sidebar/useSidebarShortcuts";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { getShortcutMenuSections } from "@web/shortcuts/data/shortcuts.data";
import { LifeGrid } from "./LifeGrid";
import { LifeSidebarContent } from "./LifeSidebarContent";
import {
  getCurrentWeekLabel,
  getTotalLifeDots,
  getWeekLivedCount,
  parseLifeDate,
} from "./life.utils";
import {
  type LifePreferences,
  readLifePreferences,
  writeLifePreferences,
} from "./life-preferences.storage";

interface LifeViewProps {
  today?: Date;
}

function formatWeeks(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function LifeView({ today }: LifeViewProps) {
  const currentDate = today ?? new Date();
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const [preferences, setPreferences] = useState(readLifePreferences);
  const totalDots = useMemo(
    () => getTotalLifeDots(preferences.lifespan),
    [preferences.lifespan],
  );
  const weeksLived = useMemo(
    () => getWeekLivedCount(preferences.birthDate, totalDots, currentDate),
    [preferences.birthDate, totalDots, currentDate],
  );
  const hasBirthDate = parseLifeDate(preferences.birthDate) !== null;
  const summary = hasBirthDate
    ? `${formatWeeks(weeksLived)} weeks lived - ${Math.floor(weeksLived / 52)} years - ${Math.round((weeksLived / totalDots) * 100)}%`
    : "Birth date not set";
  const currentWeekLabel = hasBirthDate
    ? getCurrentWeekLabel(currentDate, weeksLived, totalDots)
    : undefined;

  useResponsiveLayout();

  useEffect(() => {
    writeLifePreferences(preferences);
  }, [preferences]);

  const toggleSidebar = useCallback(() => {
    viewActions.toggleSidebar();
  }, []);
  const { closeShortcuts, isShortcutsOpen, toggleShortcuts } =
    useSidebarShortcuts({
      isSidebarOpen,
      onToggleSidebar: toggleSidebar,
    });
  const shortcutSections = useMemo(
    () =>
      getShortcutMenuSections({ view: "life", isViewingCurrentPeriod: true }),
    [],
  );
  const onPreferencesChange = useCallback(
    (update: (current: LifePreferences) => LifePreferences) => {
      setPreferences(update);
    },
    [],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <LifeCommandPalette placeholder={getCommandPalettePlaceholder("life")} />

      <main
        className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-background pt-5 pl-8 transition-[width] duration-200 ease-out motion-reduce:transition-none"
        id={ID_MAIN}
      >
        <CalendarHeader label="Life" showNavigation={false} />
        <section
          aria-label={`Life visualization: ${summary}`}
          className="min-h-0 flex-1 overflow-auto pr-5 pb-6"
        >
          <LifeGrid
            currentWeekLabel={currentWeekLabel}
            showCurrentWeek={hasBirthDate}
            totalDots={totalDots}
            weeksLived={weeksLived}
          />
        </section>
      </main>

      <ResizableSidebarPanel isOpen={isSidebarOpen}>
        <SidebarShell
          isShortcutsOpen={isShortcutsOpen}
          onCloseShortcuts={closeShortcuts}
          onToggleShortcuts={toggleShortcuts}
          shortcutSections={shortcutSections}
          shortcutsViewLabel="Life"
        >
          <LifeSidebarContent
            preferences={preferences}
            summary={summary}
            today={currentDate}
            onPreferencesChange={onPreferencesChange}
          />
        </SidebarShell>
      </ResizableSidebarPanel>
    </div>
  );
}

export default LifeView;
