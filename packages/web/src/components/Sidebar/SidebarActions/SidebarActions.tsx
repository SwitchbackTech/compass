import {
  ArrowClockwiseIcon,
  CommandIcon,
  KeyboardIcon,
} from "@phosphor-icons/react";
import { useGoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useGoogleUiState";
import { reloadLocation } from "@web/common/utils/browser/browser-navigation.util";
import { useVersionCheck } from "@web/components/Sidebar/SidebarActions/useVersionCheck";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  selectIsCmdPaletteOpen,
  settingsActions,
  useSettingsStore,
} from "@web/settings/settings.store";

interface Props {
  isShortcutsOpen: boolean;
  onToggleShortcuts: () => void;
}

export const SidebarActions = ({
  isShortcutsOpen,
  onToggleShortcuts,
}: Props) => {
  const isCmdPaletteOpen = useSettingsStore(selectIsCmdPaletteOpen);
  const { isUpdateAvailable } = useVersionCheck();
  const googleState = useGoogleUiState();
  const isCalendarSyncing =
    googleState === "IMPORTING" || googleState === "repairing";

  const handleUpdateReload = () => {
    reloadLocation();
  };

  const toggleCmdPalette = () => {
    if (isCmdPaletteOpen) {
      settingsActions.closeCmdPalette();
    } else {
      settingsActions.openCmdPalette();
    }
  };

  const shortcutsActionLabel = isShortcutsOpen
    ? "Close shortcuts"
    : "Open shortcuts";

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-border border-t px-3">
      <div className="flex items-center gap-2">
        <TooltipWrapper
          description={shortcutsActionLabel}
          shortcut="?"
          onClick={onToggleShortcuts}
        >
          <button
            aria-label={shortcutsActionLabel}
            className="flex size-9 items-center justify-center rounded-default text-text-muted transition hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            type="button"
          >
            <KeyboardIcon
              aria-hidden="true"
              size={16}
              weight={isShortcutsOpen ? "fill" : "regular"}
            />
          </button>
        </TooltipWrapper>
      </div>

      <div className="flex items-center gap-2">
        <TooltipWrapper
          description="Open command palette"
          shortcut={["Mod", "K"]}
          onClick={toggleCmdPalette}
        >
          <button
            aria-label={
              isCalendarSyncing
                ? "Open command palette, calendar syncing"
                : "Open command palette"
            }
            className="flex size-9 items-center justify-center rounded-default text-text-muted transition hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            type="button"
          >
            <span className="relative flex size-4 items-center justify-center">
              <CommandIcon
                aria-hidden="true"
                size={16}
                weight={isCmdPaletteOpen ? "fill" : "regular"}
              />
              {isCalendarSyncing ? (
                <CommandIcon
                  aria-hidden="true"
                  className="c-sync-icon-wave absolute inset-0 text-text"
                  size={16}
                  weight={isCmdPaletteOpen ? "fill" : "regular"}
                />
              ) : null}
            </span>
          </button>
        </TooltipWrapper>

        {isUpdateAvailable ? (
          <TooltipWrapper
            description="Get latest version"
            onClick={handleUpdateReload}
          >
            <button
              aria-label="Get latest version"
              className="flex size-9 items-center justify-center rounded-default text-accent transition hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              type="button"
            >
              <ArrowClockwiseIcon aria-hidden="true" size={16} />
            </button>
          </TooltipWrapper>
        ) : null}
      </div>
    </div>
  );
};
