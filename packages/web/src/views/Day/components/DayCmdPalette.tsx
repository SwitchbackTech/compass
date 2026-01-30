import { useState } from "react";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { toast } from "react-toastify";
import dayjs from "@core/util/date/dayjs";
import { useSession } from "@web/auth/hooks/useSession";
import { AuthApi } from "@web/common/apis/auth.api";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { useGoogleLoginWithSyncOverlay } from "@web/common/hooks/useGoogleLoginWithSyncOverlay";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  openEventFormCreateEvent,
  openEventFormEditEvent,
} from "@web/common/utils/event/event.util";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { toastDefaultOptions } from "@web/views/Day/components/Toasts";
import { ONBOARDING_RESTART_EVENT } from "@web/views/Onboarding/constants/onboarding.constants";
import { resetOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

interface DayCmdPaletteProps {
  onGoToToday?: () => void;
}

export const DayCmdPalette = ({ onGoToToday }: DayCmdPaletteProps) => {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectIsCmdPaletteOpen);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");
  const today = dayjs();
  const { authenticated, setAuthenticated } = useSession();

  const googleLogin = useGoogleLoginWithSyncOverlay({
    onSuccess: async (data) => {
      try {
        await AuthApi.loginOrSignup(data);
        markUserAsAuthenticated();
        setAuthenticated(true);

        // Sync local events to cloud before fetching
        const syncedCount = await syncLocalEventsToCloud();
        if (syncedCount > 0) {
          toast(
            `${syncedCount} local event(s) synced to the cloud.`,
            toastDefaultOptions,
          );
        }

        dispatch(triggerFetch());
      } catch (error) {
        console.error("Failed to authenticate:", error);
      } finally {
        dispatch(settingsSlice.actions.closeCmdPalette());
      }
    },
    onError: () => {
      dispatch(settingsSlice.actions.closeCmdPalette());
    },
  });

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
        ],
      },
      {
        heading: "Settings",
        id: "settings",
        items: [
          {
            id: "connect-google-calendar",
            children: authenticated
              ? "Google Calendar Connected"
              : "Connect Google Calendar",
            icon: authenticated ? "CheckCircleIcon" : "CloudArrowUpIcon",
            onClick: authenticated
              ? undefined
              : () => {
                  googleLogin.login();
                  dispatch(settingsSlice.actions.closeCmdPalette());
                },
          },
          {
            id: "redo-onboarding",
            children: "Re-do onboarding",
            icon: "ArrowPathIcon",
            onClick: () => {
              resetOnboardingProgress();
              window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
            },
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
