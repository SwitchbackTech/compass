import { useState } from "react";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import dayjs from "@core/util/date/dayjs";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import {
  openEventFormCreateEvent,
  openEventFormEditEvent,
} from "@web/common/utils/event/event.util";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

interface DayCmdPaletteProps {
  onGoToToday?: () => void;
}

export const DayCmdPalette = ({ onGoToToday }: DayCmdPaletteProps) => {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectIsCmdPaletteOpen);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");
  const today = dayjs();

  const filteredItems = filterItems(
    [
      {
        heading: "Navigation",
        id: "navigation",
        items: [
          {
            id: "go-to-now",
            children: "Go to Now [1]",
            icon: "ClockIcon",
            onClick: () => pressKey("1"),
          },
          {
            id: "go-to-week",
            children: "Go to Week [3]",
            icon: "CalendarIcon",
            onClick: () => pressKey("3"),
          },
          {
            id: "create-event",
            children: "Create event [n]",
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
          {
            id: "redo-onboarding",
            children: "Re-do onboarding",
            icon: "ArrowPathIcon",
            onClick: () => window.open(ROOT_ROUTES.ONBOARDING, "_blank"),
          },
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
