import { useState } from "react";
import _CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useNavigate } from "react-router-dom";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { useAuthCmdItems } from "@web/common/hooks/useAuthCmdItems";
import { useGoogleCmdItems } from "@web/common/hooks/useGoogleCmdItems";
import { useLogoutCmdItems } from "@web/common/hooks/useLogoutCmdItems";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import { resolveDefaultExport } from "@web/common/utils/resolve-default-export.util";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

const CommandPalette = resolveDefaultExport(_CommandPalette);

export const NowCmdPalette = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const open = useAppSelector(selectIsCmdPaletteOpen);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");
  const authCmdItems = useAuthCmdItems();
  const googleCmdItems = useGoogleCmdItems();
  const logoutCmdItems = useLogoutCmdItems();

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
            onClick: () => navigate(VIEW_SHORTCUTS.day.route),
          },
          {
            id: "go-to-week",
            children: `Go to Week [${VIEW_SHORTCUTS.week.key}]`,
            icon: "CalendarIcon",
            onClick: () => navigate(VIEW_SHORTCUTS.week.route),
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
        items: [...googleCmdItems, ...authCmdItems, ...logoutCmdItems],
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
