import "react-cmdk/dist/cmdk.css";
import React, { FC, useEffect, useState } from "react";
import CommandPalette, {
  filterItems,
  getItemIndex,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import { useNavigate } from "react-router-dom";
import { Categories_Event } from "@core/types/event.types";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { isDrafting } from "@web/common/utils";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";

import { getDraftTimes } from "../Calendar/components/Event/Draft/draft.util";
import { ShortcutProps } from "../Calendar/hooks/shortcuts/useShortcuts";

const CmdPalette = ({
  today,
  isCurrentWeek,
  startOfSelectedWeek,
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

  const _createSomedayDraft = (type: "week" | "month") => {
    if (type === "week" && isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }
    if (type === "month" && isAtMonthlyLimit) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    const eventType =
      type === "week"
        ? Categories_Event.SOMEDAY_WEEK
        : Categories_Event.SOMEDAY_MONTH;

    dispatch(
      draftSlice.actions.start({
        eventType,
      })
    );
  };

  const _createTimedDraft = () => {
    const { startDate, endDate } = getDraftTimes(
      isCurrentWeek,
      startOfSelectedWeek
    );

    dispatch(
      draftSlice.actions.start({
        activity: "createShortcut",
        eventType: Categories_Event.TIMED,
        event: {
          startDate,
          endDate,
        },
      })
    );
  };

  const _discardDraft = () => {
    if (isDrafting()) {
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
            onClick: () => _createTimedDraft(),
          },
          {
            id: "create-someday-week-event",
            children: "Create Week Event [w]",
            icon: "PlusIcon",
            onClick: () => _createSomedayDraft("week"),
          },
          {
            id: "create-someday-month-event",
            children: "Create Month Event [m]",
            icon: "PlusIcon",
            onClick: () => _createSomedayDraft("month"),
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
          },
          {
            id: "terms",
            children: "Terms",
            icon: "DocumentTextIcon",
            href: "https://www.compasscalendar.com/terms",
            target: "_blank",
          },
          {
            id: "privacy-policy",
            children: "Privacy Policy",
            icon: "LockClosedIcon",
            href: "https://www.compasscalendar.com/privacy",
            target: "_blank",
          },
        ],
      },
    ],
    search
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
      placeholder="Try: 'create', 'bug', or 'view code'"
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
