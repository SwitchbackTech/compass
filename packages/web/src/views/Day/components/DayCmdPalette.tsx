import { useState } from "react";
import _CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import dayjs from "@core/util/date/dayjs";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { useAuthCmdItems } from "@web/common/hooks/useAuthCmdItems";
import { useGoogleCmdItems } from "@web/common/hooks/useGoogleCmdItems";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  openEventFormCreateEvent,
  openEventFormEditEvent,
} from "@web/common/utils/event/event.util";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

// Bun's __toESM(mod, nodeInterop=1) wraps CJS+__esModule modules so .default = whole exports.
// Unwrap one level to reach the actual component function.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CommandPalette = ((_CommandPalette as any).default ??
  _CommandPalette) as typeof _CommandPalette;

interface DayCmdPaletteProps {
  onGoToToday?: () => void;
}

export const DayCmdPalette = ({ onGoToToday }: DayCmdPaletteProps) => {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectIsCmdPaletteOpen);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");
  const today = dayjs();
  const authCmdItems = useAuthCmdItems();
  const googleCmdItems = useGoogleCmdItems();

  const filteredItems = filterItems(
    [
      {
        heading: "Navigation",
        id: "navigation",
        items: [
          {
            id: "go-to-now",
            children: `Go to Now [${VIEW_SHORTCUTS.now.key}]`,
            icon: "ClockIcon",
            onClick: () => pressKey(VIEW_SHORTCUTS.now.key),
          },
          {
            id: "go-to-week",
            children: `Go to Week [${VIEW_SHORTCUTS.week.key}]`,
            icon: "CalendarIcon",
            onClick: () => pressKey(VIEW_SHORTCUTS.week.key),
          },
          {
            id: "create-event",
            children: "Create event",
            icon: "PlusIcon",
            onClick: () => queueMicrotask(openEventFormCreateEvent),
          },
          {
            id: "edit-event",
            children: "Edit event [m]",
            icon: "PencilSquareIcon",
            onClick: () => queueMicrotask(openEventFormEditEvent),
          },
          {
            id: "today",
            children: `Go to Today (${today.format("dddd, MMMM D")}) [t]`,
            icon: "ArrowUturnDownIcon",
            onClick: () => {
              onGoToToday?.();
            },
          },
        ],
      },
      {
        heading: "Settings",
        id: "settings",
        items: [
          ...googleCmdItems,
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
      placeholder="Try: 'now', 'week', 'today', 'bug', or 'code'"
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
