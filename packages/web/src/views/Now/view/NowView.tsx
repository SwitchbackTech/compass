import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { getShortcuts } from "../../../common/utils/shortcut/data/shortcuts.data";
import { NowViewProvider } from "../context/NowViewProvider";
import { NowViewContent } from "./NowViewContent";

export const NowView = () => {
  const { globalShortcuts, nowShortcuts } = getShortcuts({ isNow: true });

  return (
    <NowViewProvider>
      <div className="from-bg-bg-primary via-bg-bg-secondary to-bg-bg-primary fixed inset-0 overflow-hidden bg-gradient-to-b">
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
