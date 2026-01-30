import { useState } from "react";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { useSession } from "@web/auth/hooks/useSession";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { createSomedayDraft } from "@web/common/utils/draft/someday.draft.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { ShortcutProps } from "@web/views/Calendar/hooks/shortcuts/useWeekShortcuts";
import { ONBOARDING_RESTART_EVENT } from "@web/views/Onboarding/constants/onboarding.constants";
import { resetOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

const CmdPalette = ({
  today,
  isCurrentWeek,
  startOfView,
  endOfView,
  util,
  scrollUtil,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const open = useAppSelector(selectIsCmdPaletteOpen);
  const [page] = useState<"root" | "projects">("root");
  const [search, setSearch] = useState("");
  const { authenticated } = useSession();
  const googleLogin = useGoogleAuth();

  const handleCreateSomedayDraft = async (
    category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
  ) => {
    if (category === Categories_Event.SOMEDAY_WEEK && isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }
    if (category === Categories_Event.SOMEDAY_MONTH && isAtMonthlyLimit) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    await createSomedayDraft(
      category,
      startOfView,
      endOfView,
      "createShortcut",
      dispatch,
    );
  };

  const _discardDraft = () => {
    if (isEventFormOpen()) {
      dispatch(draftSlice.actions.discard(undefined));
    }
  };

  const filteredItems = filterItems(
    [
      {
        heading: "Common Tasks",
        id: "general",
        items: [
          {
            id: "create-event",
            children: "Create Event [c]",
            icon: "PlusIcon",
            onClick: onEventTargetVisibility(() =>
              createTimedDraft(
                isCurrentWeek,
                startOfView,
                "createShortcut",
                dispatch,
              ),
            ),
          },
          {
            id: "create-allday-event",
            children: "Create All-Day Event [a]",
            icon: "PlusIcon",
            onClick: onEventTargetVisibility(() =>
              createAlldayDraft(
                startOfView,
                endOfView,
                "createShortcut",
                dispatch,
              ),
            ),
          },
          {
            id: "create-someday-week-event",
            children: "Create Week Event [w]",
            icon: "PlusIcon",
            onClick: onEventTargetVisibility(() =>
              handleCreateSomedayDraft(Categories_Event.SOMEDAY_WEEK),
            ),
          },
          {
            id: "create-someday-month-event",
            children: "Create Month Event [m]",
            icon: "PlusIcon",
            onClick: onEventTargetVisibility(() =>
              handleCreateSomedayDraft(Categories_Event.SOMEDAY_MONTH),
            ),
          },
          {
            id: "today",
            children: `Go to Today (${today.format("dddd, MMMM D")}) [t]`,
            icon: "ArrowUturnDownIcon",
            onClick: () => {
              scrollUtil.scrollToNow();
              _discardDraft();
              util.goToToday();
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
      placeholder="Try: 'create', 'bug', or 'code'"
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

export default CmdPalette;
