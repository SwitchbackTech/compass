import { getTodayShortcuts } from "../data/today.shortcuts";
import { ShortcutSection } from "./ShortcutSection";

export const ShortcutsOverlay = () => {
  const {
    global,
    homeShortcuts,
    dayTaskShortcuts,
    dayAgendaShortcuts,
    nowShortcuts,
    isHome,
    isToday,
    isNow,
  } = getTodayShortcuts();

  const show =
    global.length ||
    homeShortcuts.length ||
    dayTaskShortcuts.length ||
    dayAgendaShortcuts.length ||
    nowShortcuts.length;
  if (!show) return null;

  return (
    <aside
      aria-label="Shortcut overlay"
      className="fixed top-24 left-3 z-30 hidden w-[240px] rounded-lg border border-white/10 bg-[#1e1e1e]/90 p-3 shadow-lg backdrop-blur-sm md:block"
    >
      <div className="mb-2 text-xs font-medium text-white">Shortcuts</div>
      {isHome && <ShortcutSection title="Home" shortcuts={homeShortcuts} />}
      {isToday && (
        <>
          <ShortcutSection title="Tasks" shortcuts={dayTaskShortcuts} />
          <ShortcutSection title="Calendar" shortcuts={dayAgendaShortcuts} />
        </>
      )}
      {isNow && <ShortcutSection title="Now" shortcuts={nowShortcuts} />}
      <ShortcutSection title="Global" shortcuts={global} />
    </aside>
  );
};
