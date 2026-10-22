import { useCallback } from "react";
import { KEYMAP } from "@core/shortcuts/keymap";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { copyMeetingLinkUrl } from "@web/views/Forms/EventForm/conference-link.util";

export function useCopyMeetingLinkShortcut(
  meetingLinkUrl: string | null | undefined,
  enabled: boolean,
) {
  const url = meetingLinkUrl?.trim() || null;
  // useAppShortcut already applies preventDefault/stopPropagation from the
  // options below, so the handler only has to do the copy.
  const handler = useCallback(() => {
    if (url) void copyMeetingLinkUrl(url);
  }, [url]);

  useAppShortcut(KEYMAP.copyMeetingLink.hotkey, handler, {
    enabled: enabled && url !== null,
    ignoreInputs: false,
    preventDefault: true,
    stopPropagation: true,
    shortcutId: "edit-copy-meeting-link",
  });
}
