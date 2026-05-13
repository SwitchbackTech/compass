import { type JsonStructureItem } from "react-cmdk";

export const moreCommandPaletteItems: Array<{
  heading: string;
  id: string;
  items: JsonStructureItem[];
}> = [
  {
    heading: "More",
    id: "advanced",
    items: [
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
        icon: "ChatBubbleLeftRightIcon",
        href: "https://github.com/SwitchbackTech/compass/discussions",
        target: "_blank",
      },
      {
        id: "version",
        children: `Version: ${typeof BUILD_VERSION === "string" ? BUILD_VERSION : "dev"}`,
        icon: "InformationCircleIcon",
        onClick: () => {
          const v =
            typeof BUILD_VERSION === "string" ? BUILD_VERSION : "dev";
          void navigator.clipboard.writeText(v);
        },
      },
    ],
  },
];
