import "react-cmdk/dist/cmdk.css";
import CommandPalette, {
  filterItems,
  getItemIndex,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import React, { FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Categories_Event } from "@core/types/event.types";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Flex } from "@web/components/Flex";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { isDrafting } from "@web/common/utils";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";

import { StyledKeyTip } from "./styled";
import { getDraftTimes } from "../Calendar/components/Event/Draft/draft.util";
import { ShortcutProps } from "../Calendar/hooks/shortcuts/useShortcuts";

const Cmd: FC<{ title: string; shortcut: string }> = ({ shortcut, title }) => {
  return (
    <Flex
      alignItems={AlignItems.CENTER}
      justifyContent={JustifyContent.SPACE_BETWEEN}
      style={{ color: "#FFF" }}
    >
      <span>{title}</span>
      <StyledKeyTip style={{ marginLeft: "20px" }}>{shortcut}</StyledKeyTip>
    </Flex>
  );
};

const CmdPalette = ({
  today,
  dateCalcs,
  isCurrentWeek,
  startOfSelectedWeek,
  util,
  scrollUtil,
  toggleSidebar,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);

  const [page, setPage] = useState<"root" | "projects">("root");
  const [open, setOpen] = useState<boolean>(true);
  const [search, setSearch] = useState("");

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
            children: <Cmd title="Create Event" shortcut="C" />,
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
          },
          {
            id: "privacy-policy",
            children: "Privacy Policy",
            icon: "LockClosedIcon",
            href: "https://www.compasscalendar.com/privacy",
          },
        ],
      },
    ],
    search
  );

  return (
    <CommandPalette
      onChangeSearch={setSearch}
      onChangeOpen={setOpen}
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

      <CommandPalette.Page id="projects">
        <h1>Info about Projets</h1>
      </CommandPalette.Page>
    </CommandPalette>
  );
};

export default CmdPalette;
