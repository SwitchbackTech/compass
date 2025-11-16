import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutsOverlay";
import { getShortcuts } from "../../common/utils/shortcut/data/shortcuts.data";
import { NowViewProvider } from "./context/NowViewProvider";
import { NowViewContent } from "./view/NowViewContent";

export const NowView = () => {
  // Get shortcuts for the Now view
  const { globalShortcuts, nowShortcuts } = getShortcuts({ isNow: true });

  return (
    <NowViewProvider>
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
        <ShortcutsOverlay
          sections={[
            { title: "Now", shortcuts: nowShortcuts },
            { title: "Global", shortcuts: globalShortcuts },
          ]}
        />
        <NowViewContent />
      </div>
    </NowViewProvider>
  );
};
