import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutsOverlay";
import { getShortcuts } from "../Day/components/Shortcuts/data/shortcuts.data";
import { useNowShortcuts } from "./shortcuts/useNowShortcuts";
import { NowViewContent } from "./view/NowViewContent";

export const NowView = () => {
  // Initialize keyboard shortcuts
  useNowShortcuts();

  // Get shortcuts for the Now view
  const { global, nowShortcuts } = getShortcuts({ isNow: true });

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      <ShortcutsOverlay
        sections={[
          { title: "Now", shortcuts: nowShortcuts },
          { title: "Global", shortcuts: global },
        ]}
      />
      <NowViewContent />
    </div>
  );
};
