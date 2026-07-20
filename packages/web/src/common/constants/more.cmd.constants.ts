import { BugIcon, ChatsIcon, InfoIcon } from "@phosphor-icons/react";
import { isPosthogEnabled } from "@web/auth/posthog/posthog.util";
import { APP_VERSION } from "@web/common/constants/version.constants";
import { type CommandSection } from "@web/components/CommandPalette/command-palette.types";
import { feedbackActions } from "@web/components/Feedback/feedback.store";
import { type ViewName } from "@web/shortcuts/shortcuts.constants";

export function getCommandPalettePlaceholder(currentView: ViewName): string {
  if (currentView === "day") {
    return "Try: 'week', 'today', 'bug', or 'feedback'";
  }

  return "Try: 'create', 'bug', or 'feedback'";
}

export function getMoreCommandPaletteSections(
  currentView: ViewName,
  feedbackEnabled = isPosthogEnabled(),
): CommandSection[] {
  const feedbackItems = feedbackEnabled
    ? [
        {
          id: "report-bug",
          label: "Report Bug",
          icon: BugIcon,
          onClick: () => feedbackActions.open("bug", currentView),
        },
        {
          id: "share-feedback",
          label: "Share Feedback",
          icon: ChatsIcon,
          onClick: () => feedbackActions.open("suggestion", currentView),
        },
      ]
    : [
        {
          id: "report-bug",
          label: "Report Bug",
          icon: BugIcon,
          href: "https://github.com/SwitchbackTech/compass/issues/new?assignees=&projects=&template=2-bug-report.yml",
          target: "_blank" as const,
        },
        {
          id: "share-feedback",
          label: "Share Feedback",
          icon: ChatsIcon,
          href: "https://github.com/SwitchbackTech/compass/discussions",
          target: "_blank" as const,
        },
      ];

  return [
    {
      heading: "More",
      id: "advanced",
      items: [
        ...feedbackItems,
        {
          id: "version",
          label: `Version: ${APP_VERSION}`,
          icon: InfoIcon,
          onClick: () => {
            void navigator.clipboard.writeText(APP_VERSION);
          },
        },
      ],
    },
  ];
}
