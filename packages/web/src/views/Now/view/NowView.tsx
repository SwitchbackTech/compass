import { useEffect } from "react";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { StyledCalendar } from "@web/views/Calendar/styled";
import { Header } from "@web/views/Day/components/Header/Header";
import { NowCmdPalette } from "@web/views/Now/components/NowCmdPalette";
import { NowViewProvider } from "@web/views/Now/context/NowViewProvider";
import { NowViewContent } from "@web/views/Now/view/NowViewContent";
import { CmdPaletteGuide } from "@web/views/Onboarding/components/CmdPaletteGuide";

export const NowView = () => {
  const { togglePointerMovementTracking } = usePointerPosition();
  const { globalShortcuts, nowShortcuts } = getShortcuts({
    isNow: true,
  });

  useEffect(() => {
    togglePointerMovementTracking(true);

    return () => togglePointerMovementTracking(false);
  }, [togglePointerMovementTracking]);

  return (
    <NowViewProvider>
      <NowCmdPalette />
      <CmdPaletteGuide showOnNowView={true} />
      <StyledCalendar>
        <Header showReminder={true} />

        <div
          className={`from-bg-bg-primary via-bg-bg-secondary to-bg-bg-primary flex max-w-3/4 min-w-3/4 flex-1 justify-center gap-8 self-center overflow-hidden bg-gradient-to-b`}
        >
          <NowViewContent />
        </div>
      </StyledCalendar>

      <ShortcutsOverlay
        sections={[
          { title: "Now", shortcuts: nowShortcuts },
          { title: "Global", shortcuts: globalShortcuts },
        ]}
      />
    </NowViewProvider>
  );
};
