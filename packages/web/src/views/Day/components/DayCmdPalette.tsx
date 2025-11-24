import { useCallback, useEffect, useState } from "react";
import CommandPalette, {
  filterItems,
  getItemIndex,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useNavigate } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { onEventTargetVisibility } from "@web/common/utils/event/event-target-visibility.util";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

interface DayCmdPaletteProps {
  onGoToToday?: () => void;
}

export const DayCmdPalette = ({ onGoToToday }: DayCmdPaletteProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const _open = useAppSelector(selectIsCmdPaletteOpen);

  const [open, setOpen] = useState<boolean>(false);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");

  const escapeListener = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        dispatch(settingsSlice.actions.closeCmdPalette());
      }
    },
    [dispatch, setOpen, open],
  );

  useEffect(() => {
    setOpen(_open);
  }, [_open]);

  useEffect(() => {
    window.addEventListener("keydown", escapeListener);

    return () => window.removeEventListener("keydown", escapeListener);
  }, [escapeListener]);

  useHandleOpenCommandPalette(setOpen);

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
            onClick: () => navigate(ROOT_ROUTES.NOW),
          },
          {
            id: "go-to-week",
            children: "Go to Week [3]",
            icon: "CalendarIcon",
            onClick: () => navigate(ROOT_ROUTES.ROOT),
          },
          {
            id: "edit-reminder",
            children: `Edit Reminder [r]`,
            icon: "PencilSquareIcon",
            onClick: onEventTargetVisibility(() =>
              dispatch(viewSlice.actions.updateReminder(true)),
            ),
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
            onClick: () => navigate(ROOT_ROUTES.LOGOUT),
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
      onChangeOpen={() => {
        dispatch(settingsSlice.actions.closeCmdPalette());
        setOpen(!open);
      }}
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
