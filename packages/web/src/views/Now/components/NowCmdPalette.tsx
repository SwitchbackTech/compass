import { useState } from "react";
import _CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { useAuthCmdItems } from "@web/common/hooks/useAuthCmdItems";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

// Bun's __toESM(mod, nodeInterop=1) wraps CJS+__esModule modules so .default = whole exports.
// Unwrap one level to reach the actual component function.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CommandPalette = ((_CommandPalette as any).default ??
  _CommandPalette) as typeof _CommandPalette;

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
            children: `Go to Day [${VIEW_SHORTCUTS.day.key}]`,
            icon: "CalendarDaysIcon",
            onClick: () => pressKey(VIEW_SHORTCUTS.day.key),
          },
          {
            id: "go-to-week",
            children: `Go to Week [${VIEW_SHORTCUTS.week.key}]`,
            icon: "CalendarIcon",
            onClick: () => pressKey(VIEW_SHORTCUTS.week.key),
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
