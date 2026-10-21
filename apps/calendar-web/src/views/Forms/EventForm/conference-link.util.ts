import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";

export const MEETING_LINK_COPIED_TOAST_ID = "meeting-link-copied";

export async function copyMeetingLinkUrl(url: string): Promise<boolean> {
  const didCopy = await copyText(url);
  if (didCopy) {
    showStatusToast(MEETING_LINK_COPIED_TOAST_ID, "Link copied");
  }
  return didCopy;
}
