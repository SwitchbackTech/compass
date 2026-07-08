import { BugIcon, ChatsIcon, InfoIcon } from "@phosphor-icons/react";
import { type CommandSection } from "@web/components/CommandPalette/command-palette.types";

export const moreCommandPaletteItems: CommandSection[] = [
  {
    heading: "More",
    id: "advanced",
    items: [
      {
        id: "report-bug",
        label: "Report Bug",
        icon: BugIcon,
        href: "https://github.com/SwitchbackTech/compass/issues/new?assignees=&projects=&template=2-bug-report.yml",
        target: "_blank",
      },
      {
        id: "share-feedback",
        label: "Share Feedback",
        icon: ChatsIcon,
        href: "https://github.com/SwitchbackTech/compass/discussions",
        target: "_blank",
      },
      {
        id: "version",
        label: `Version: ${typeof BUILD_VERSION === "string" ? BUILD_VERSION : "dev"}`,
        icon: InfoIcon,
        onClick: () => {
          const v = typeof BUILD_VERSION === "string" ? BUILD_VERSION : "dev";
          void navigator.clipboard.writeText(v);
        },
      },
    ],
  },
];
