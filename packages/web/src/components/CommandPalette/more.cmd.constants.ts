import { ChatsIcon, InfoIcon } from "@phosphor-icons/react";
import { isPosthogEnabled } from "@web/auth/posthog/posthog.util";
import { APP_VERSION } from "@web/common/constants/version.constants";
import { type CommandSection } from "@web/components/CommandPalette/command-palette.types";
import { feedbackActions } from "@web/components/Feedback/feedback.store";
import { type ViewName } from "@web/shortcuts/shortcuts.constants";
import { type CommandPaletteViewName } from "./navigation.cmd.constants";

export function getCommandPalettePlaceholder(
  currentView: CommandPaletteViewName,
  feedbackEnabled = isPosthogEnabled(),
): string {
  if (currentView === "life") {
    return feedbackEnabled
      ? "Try: 'day', 'week', or 'feedback'"
      : "Try: 'day', 'week', or 'theme'";
  }

  if (currentView === "day") {
    return feedbackEnabled
      ? "Try: 'week', 'today', or 'feedback'"
      : "Try: 'week' or 'today'";
  }

  return feedbackEnabled ? "Try: 'create' or 'feedback'" : "Try: 'create'";
}

export function getMoreCommandPaletteSections(
  currentView: ViewName,
  feedbackEnabled = isPosthogEnabled(),
): CommandSection[] {
  const feedbackItems = feedbackEnabled
    ? [
        {
          id: "share-feedback",
          label: "Share Feedback",
          icon: ChatsIcon,
          onClick: () => feedbackActions.open(currentView),
        },
      ]
    : [];

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
