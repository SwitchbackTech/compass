import { ShortcutSection } from "../Day/components/Shortcuts/components/ShortcutSection";
import { getShortcuts } from "../Day/components/Shortcuts/data/shortcuts.data";
import { useNowShortcuts } from "./useNowShortcuts";
import { NowViewContent } from "./view/NowViewContent";

export const NowView = () => {
  // Initialize keyboard shortcuts
  useNowShortcuts();

  // Get shortcuts for the Now view
  const { global } = getShortcuts({ isNow: true });

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      <aside
        aria-label="Shortcut overlay"
        className="fixed top-24 left-3 z-30 hidden w-[240px] rounded-lg border border-white/10 bg-[#1e1e1e]/90 p-3 shadow-lg backdrop-blur-sm md:block"
      >
        <div className="mb-2 text-xs font-medium text-white">Shortcuts</div>
        <ShortcutSection title="Global" shortcuts={global} />
      </aside>

      <NowViewContent />
    </div>
  );
};
