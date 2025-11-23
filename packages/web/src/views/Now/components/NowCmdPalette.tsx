import { useEffect, useState } from "react";
import CommandPalette, {
  filterItems,
  getItemIndex,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import "react-cmdk/dist/cmdk.css";
import { useNavigate } from "react-router-dom";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export const NowCmdPalette = () => {
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
            onClick: () => navigate(ROOT_ROUTES.DAY),
          },
          {
            id: "go-to-week",
            children: "Go to Week [3]",
            icon: "CalendarIcon",
            onClick: () => navigate(ROOT_ROUTES.ROOT),
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
