import { JsonStructureItem } from "react-cmdk";

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
        icon: "ChatBubbleLeftRightIcon",
        href: "https://github.com/SwitchbackTech/compass/discussions",
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
];
