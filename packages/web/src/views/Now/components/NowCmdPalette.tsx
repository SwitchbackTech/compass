import { useState } from "react";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { useAuthCmdItems } from "@web/common/hooks/useAuthCmdItems";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { SHORTCUTS } from "@web/hotkeys/registry/shortcut.registry";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export const NowCmdPalette = () => {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectIsCmdPaletteOpen);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");
  const { commandAction } = useConnectGoogle();
  const authCmdItems = useAuthCmdItems();

  const filteredItems = filterItems(
    [
      {
        heading: "Navigation",
        id: "navigation",
        items: [
          {
            id: "go-to-day",
            children: `Go to Day [${SHORTCUTS.NAV_DAY.display}]`,
            icon: "CalendarDaysIcon",
            onClick: () => pressKey(SHORTCUTS.NAV_DAY.display),
          },
          {
            id: "go-to-week",
            children: `Go to Week [${SHORTCUTS.NAV_WEEK.display}]`,
            icon: "CalendarIcon",
            onClick: () => pressKey(SHORTCUTS.NAV_WEEK.display),
          },
          {
            id: "edit-reminder",
            children: `Edit Reminder [r]`,
            icon: "PencilSquareIcon",
            onClick: onEventTargetVisibility(() => pressKey("r")),
          },
        ],
      },
      {
        heading: "Settings",
        id: "settings",
        items: [
          {
            id: "connect-google-calendar",
            children: commandAction.label,
            icon: commandAction.icon,
            disabled: commandAction.isDisabled,
            onClick: commandAction.onSelect,
          },
          ...authCmdItems,
          {
            id: "log-out",
            children: "Log Out [z]",
            icon: "ArrowRightOnRectangleIcon",
            onClick: () => pressKey("z"),
          },
        ],
      },
      ...moreCommandPaletteItems,
    ],
    search,
  );

  return (
    <CommandPalette
      onChangeSearch={setSearch}
      onChangeOpen={() => dispatch(settingsSlice.actions.closeCmdPalette())}
      search={search}
      isOpen={open}
      page={page}
      placeholder="Try: 'day', 'week', 'bug', or 'code'"
    >
      <CommandPalette.Page id="root">
        {filteredItems.length ? (
          filteredItems.map((list) => (
            <CommandPalette.List key={list.id} heading={list.heading}>
              {list.items.map(({ id, ...rest }) => (
                <CommandPalette.ListItem
                  key={id}
                  index={getItemIndex(filteredItems, id)}
                  {...rest}
                />
              ))}
            </CommandPalette.List>
          ))
        ) : (
          <CommandPalette.FreeSearchAction />
        )}
      </CommandPalette.Page>
    </CommandPalette>
  );
};
