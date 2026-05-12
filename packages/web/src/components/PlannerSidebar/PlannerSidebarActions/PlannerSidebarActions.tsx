import {
  ArrowClockwiseIcon,
  CommandIcon,
  KeyboardIcon,
} from "@phosphor-icons/react";
import { useVersionCheck } from "@web/common/hooks/useVersionCheck";
import { reloadLocation } from "@web/common/utils/browser/browser-navigation.util";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

interface Props {
  isShortcutsOpen: boolean;
  onOpenShortcuts: () => void;
}

export const PlannerSidebarActions = ({
  isShortcutsOpen,
  onOpenShortcuts,
}: Props) => {
  const dispatch = useAppDispatch();
  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);
  const { isUpdateAvailable } = useVersionCheck();

  const handleUpdateReload = () => {
    reloadLocation();
  };

  const toggleCmdPalette = () => {
    if (isCmdPaletteOpen) {
      dispatch(settingsSlice.actions.closeCmdPalette());
    } else {
      dispatch(settingsSlice.actions.openCmdPalette());
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-border-primary border-t px-3">
      <div className="flex items-center gap-2">
        <TooltipWrapper description="Open shortcuts" onClick={onOpenShortcuts}>
          <button
            aria-label="Open shortcuts"
            className="flex size-9 items-center justify-center rounded-default text-text-light-inactive transition hover:bg-panel-bg hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
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
          shortcut={
            <span className="flex items-center gap-1">
              {getModifierKeyIcon()} + K
            </span>
          }
          onClick={toggleCmdPalette}
        >
          <button
            aria-label="Open command palette"
            className="flex size-9 items-center justify-center rounded-default text-text-light-inactive transition hover:bg-panel-bg hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            type="button"
          >
            <CommandIcon
              aria-hidden="true"
              size={16}
              weight={isCmdPaletteOpen ? "fill" : "regular"}
            />
          </button>
        </TooltipWrapper>

        {isUpdateAvailable ? (
          <TooltipWrapper
            description="Get latest version"
            onClick={handleUpdateReload}
          >
            <button
              aria-label="Get latest version"
              className="flex size-9 items-center justify-center rounded-default text-accent-primary transition hover:bg-panel-bg hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
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
