import { useEffect, useState } from "react";
import CommandPalette, {
  filterItems,
  getItemIndex,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useNavigate } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
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

  useEffect(() => {
    setOpen(_open);
  }, [_open]);

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
        heading: "More",
        id: "advanced",
        items: [
          {
            id: "redo-onboarding",
            children: "Re-do onboarding",
            icon: "ArrowPathIcon",
            onClick: () => window.open(ROOT_ROUTES.ONBOARDING, "_blank"),
          },
          {
            id: "code",
            children: "View Code",
            icon: "CodeBracketIcon",
            href: "https://github.com/SwitchbackTech/compass",
            target: "_blank",
          },
          {
            id: "report-bug",
            children: "Report Bug",
            icon: "BugAntIcon",
            href: "https://github.com/SwitchbackTech/compass/issues/new?assignees=&projects=&template=2-bug-report.yml",
            target: "_blank",
          },
          {
            id: "share-feedback",
            children: "Share Feedback",
            icon: "EnvelopeOpenIcon",
            href: "mailto:tyler@switchback.tech",
            target: "_blank",
          },
          {
            id: "discord",
            children: "Join Discord",
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
          {
            id: "log-out",
            children: "Log Out",
            icon: "ArrowRightOnRectangleIcon",
            onClick: () => navigate(ROOT_ROUTES.LOGOUT),
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
