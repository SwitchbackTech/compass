import { useState } from "react";
import _CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "@core/util/date/dayjs";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { getNavigationCommandItems } from "@web/common/constants/navigation.cmd.constants";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { useAuthCmdItems } from "@web/common/hooks/useAuthCmdItems";
import { useGoogleCmdItems } from "@web/common/hooks/useGoogleCmdItems";
import { useLogoutCmdItems } from "@web/common/hooks/useLogoutCmdItems";
import { useSubscribeCmdItems } from "@web/common/hooks/useSubscribeCmdItems";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { resolveDefaultExport } from "@web/common/utils/resolve-default-export.util";
import {
  selectIsCmdPaletteOpen,
  settingsActions,
  useSettingsStore,
} from "@web/settings/settings.store";
import {
  openEventFormCreateEvent,
  openEventFormEditEvent,
} from "@web/views/Day/interaction/dayCalendarFocus.util";

const CommandPalette = resolveDefaultExport(_CommandPalette);

interface DayCmdPaletteProps {
  onGoToToday?: () => void;
}

export const DayCmdPalette = ({ onGoToToday }: DayCmdPaletteProps) => {
  const navigate = useNavigate();
  const open = useSettingsStore(selectIsCmdPaletteOpen);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");
  const today = dayjs();
  const authCmdItems = useAuthCmdItems();
  const googleCmdItems = useGoogleCmdItems();
  const logoutCmdItems = useLogoutCmdItems();
  const subscribeCmdItems = useSubscribeCmdItems();

  const filteredItems = filterItems(
    [
      {
        heading: "Navigation",
        id: "navigation",
        items: getNavigationCommandItems({
          currentView: "day",
          onGoToToday: () => {
            onGoToToday?.();
          },
          onNavigateToView: (viewName) => {
            navigate({ to: VIEW_SHORTCUTS[viewName].route });
          },
          today,
        }),
      },
      {
        heading: "Common Tasks",
        id: "general",
        items: [
          {
            id: "create-event",
            children: "Create event",
            icon: "PlusIcon",
            onClick: () => queueMicrotask(openEventFormCreateEvent),
          },
          {
            id: "create-allday-event",
            children: "Create all-day event [a]",
            icon: "PlusIcon",
            onClick: () =>
              queueMicrotask(() =>
                compassEventEmitter.emit(CompassDOMEvents.CREATE_ALLDAY_DRAFT),
              ),
          },
          {
            id: "edit-event",
            children: "Edit event [m]",
            icon: "PencilSquareIcon",
            onClick: () => queueMicrotask(openEventFormEditEvent),
          },
        ],
      },
      {
        heading: "Settings",
        id: "settings",
        items: [
          ...googleCmdItems,
          ...subscribeCmdItems,
          ...authCmdItems,
          ...logoutCmdItems,
        ],
      },
      ...moreCommandPaletteItems,
    ],
    search,
  );

  return (
    <CommandPalette
      onChangeSearch={setSearch}
      onChangeOpen={() => settingsActions.closeCmdPalette()}
      search={search}
      isOpen={open}
      page={page}
      placeholder="Try: 'week', 'today', 'bug', or 'code'"
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
