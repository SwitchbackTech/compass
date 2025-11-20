import { ID_MAIN } from "@web/common/constants/web.constants";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { FlexDirections } from "@web/components/Flex/styled";
import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { StyledCalendar } from "@web/views/Calendar/styled";
import { Header } from "@web/views/Day/components/Header/Header";
import { NowViewProvider } from "@web/views/Now/context/NowViewProvider";
import { NowViewContent } from "@web/views/Now/view/NowViewContent";

export const NowView = () => {
  const { globalShortcuts, nowShortcuts } = getShortcuts({ isNow: true });

  return (
    <NowViewProvider>
      <StyledCalendar
        direction={FlexDirections.COLUMN}
        id={ID_MAIN}
        className="flex-column flex h-screen overflow-hidden"
      >
        <Header />

        <div
          className={`from-bg-bg-primary via-bg-bg-secondary to-bg-bg-primary flex flex-1 gap-8 self-center overflow-hidden bg-gradient-to-b px-6 py-8`}
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
