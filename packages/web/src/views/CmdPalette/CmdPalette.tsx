import React, { useEffect, useState } from "react";
import CommandPalette, {
  filterItems,
  getItemIndex,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useNavigate } from "react-router-dom";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { isEventFormOpen } from "@web/common/utils";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { createSomedayDraft } from "@web/common/utils/draft/someday.draft.util";
import { onEventTargetVisibility } from "@web/common/utils/event-target-visibility.util";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { ShortcutProps } from "../Calendar/hooks/shortcuts/useShortcuts";

const CmdPalette = ({
  today,
  isCurrentWeek,
  startOfView,
  endOfView,
  util,
  scrollUtil,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const _open = useAppSelector(selectIsCmdPaletteOpen);

  const [open, setOpen] = useState<boolean>(false);
  const [page] = useState<"root" | "projects">("root");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setOpen(_open);
  }, [_open]);

  useHandleOpenCommandPalette(setOpen);

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
      dispatch(draftSlice.actions.discard());
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
            id: "edit-focus-note",
            children: `Edit Focus Note [f]`,
            icon: "PencilSquareIcon",
            onClick: onEventTargetVisibility(() =>
              dispatch(viewSlice.actions.focusHeaderNote(true)),
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
          {
            id: "report-bug",
            children: "Report Bug",
            icon: "BugAntIcon",
            href: "https://github.com/SwitchbackTech/compass/issues/new?assignees=&labels=bug&projects=&template=2-Bug_report.md&title=",
            target: "_blank",
          },
          {
            id: "log-out",
            children: "Log Out [z]",
            icon: "ArrowRightOnRectangleIcon",
            onClick: () => navigate(ROOT_ROUTES.LOGOUT),
          },
          {
            id: "share-feedback",
            children: "Share Feedback",
            icon: "EnvelopeOpenIcon",
            href: "mailto:tyler@switchback.tech",
            target: "_blank",
          },
        ],
      },
      {
        heading: "More",
        id: "advanced",
        items: [
          {
            id: "code",
            children: "Code",
            icon: "CodeBracketIcon",
            href: "https://github.com/SwitchbackTech/compass",
            target: "_blank",
          },
          {
            id: "discord",
            children: "Discord",
            icon: "ChatBubbleLeftRightIcon",
            href: "https://www.discord.gg/H3DVMnKmUd",
            target: "_blank",
          },
          {
            id: "donate",
            children: "Donate",
            icon: "CreditCardIcon",
            href: "https://buy.stripe.com/cNi8wQ6pE9gyejz6hZ9sk00",
            target: "_blank",
          },
        ],
      },
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
