import { useCallback } from "react";
import { KEYMAP } from "@core/shortcuts/keymap";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { copyMeetingLinkUrl } from "@web/views/Forms/EventForm/conference-link.util";

export function useCopyMeetingLinkShortcut(
  meetingLinkUrl: string | null | undefined,
  enabled: boolean,
) {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      const url = meetingLinkUrl?.trim();
      if (!url) return;

      event.preventDefault();
      event.stopPropagation();
      void copyMeetingLinkUrl(url);
    },
    [meetingLinkUrl],
  );

  useAppShortcut(KEYMAP.copyMeetingLink.hotkey, handler, {
    enabled: enabled && Boolean(meetingLinkUrl?.trim()),
    ignoreInputs: false,
    preventDefault: true,
    stopPropagation: true,
    shortcutId: "edit-copy-meeting-link",
  });
}
