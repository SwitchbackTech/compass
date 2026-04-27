import { useEffect } from "react";
import { useSession } from "@web/auth/compass/session/useSession";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";
import { useSidebarState } from "@web/common/hooks/useSidebarState";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { StyledCalendar } from "@web/views/Calendar/styled";
import { Header } from "@web/views/Day/components/Header/Header";
import { ShortcutsSidebar } from "@web/views/Day/components/ShortcutsSidebar/ShortcutsSidebar";
import { NowCmdPalette } from "@web/views/Now/components/NowCmdPalette";
import { NowViewProvider } from "@web/views/Now/context/NowViewProvider";
import { useNowShortcuts } from "@web/views/Now/shortcuts/useNowShortcuts";
import { NowViewContent } from "@web/views/Now/view/NowViewContent";

export const NowView = () => {
  const { authenticated } = useSession();
  const { togglePointerMovementTracking } = usePointerPosition();
  const { isSidebarOpen, toggleSidebar } = useSidebarState();
  const { globalShortcuts, nowShortcuts } = getShortcuts({
    isAuthenticated: authenticated,
    isNow: true,
  });

  useEffect(() => {
    togglePointerMovementTracking(true);

    return () => togglePointerMovementTracking(false);
  }, [togglePointerMovementTracking]);

  useNowShortcuts({ onToggleSidebar: toggleSidebar });

  return (
    <NowViewProvider>
      <NowCmdPalette />
      <StyledCalendar>
        <Header
          showReminder={true}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        <div className="from-bg-bg-primary via-bg-bg-secondary to-bg-bg-primary flex w-full flex-1 justify-center gap-8 overflow-hidden bg-gradient-to-b xl:max-w-3/4 xl:self-center">
          <NowViewContent />
        </div>
      </StyledCalendar>

      <ShortcutsSidebar
        isOpen={isSidebarOpen}
        sections={[
          { title: "Now", shortcuts: nowShortcuts },
          { title: "Global", shortcuts: globalShortcuts },
        ]}
      />
    </NowViewProvider>
  );
};
