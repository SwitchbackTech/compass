import { useState } from "react";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useSession } from "@web/auth/hooks/useSession";
import { AuthApi } from "@web/common/apis/auth.api";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { ONBOARDING_RESTART_EVENT } from "@web/views/Onboarding/constants/onboarding.constants";
import { resetOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

export const NowCmdPalette = () => {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectIsCmdPaletteOpen);
  const [page] = useState<"root">("root");
  const [search, setSearch] = useState("");
  const { authenticated, setAuthenticated } = useSession();

  const googleLogin = useGoogleLogin({
    onSuccess: async (data) => {
      try {
        await AuthApi.loginOrSignup(data);
        markUserAsAuthenticated();
        setAuthenticated(true);
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
            id: "go-to-day",
            children: "Go to Day [2]",
            icon: "CalendarDaysIcon",
            onClick: () => pressKey("2"),
          },
          {
            id: "go-to-week",
            children: "Go to Week [3]",
            icon: "CalendarIcon",
            onClick: () => pressKey("3"),
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
