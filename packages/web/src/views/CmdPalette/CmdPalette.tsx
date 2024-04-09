import "react-cmdk/dist/cmdk.css";
import CommandPalette, {
  filterItems,
  getItemIndex,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import React, { useState } from "react";

const CmdPalette = () => {
  const [page, setPage] = useState<"root" | "projects">("root");
  const [open, setOpen] = useState<boolean>(true);
  const [search, setSearch] = useState("");

  useHandleOpenCommandPalette(setOpen);

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
            onClick: () => {
              alert("Creating event...");
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
            onClick: () => {
              alert("Logging out...");
            },
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
        heading: "Other Links",
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
