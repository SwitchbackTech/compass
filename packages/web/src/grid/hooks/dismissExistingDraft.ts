import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { draftActions } from "@web/events/stores/draft.store";

const DISCARDED_DRAFT_TOAST_ID = "discarded-grid-draft";

export function dismissExistingDraft(): void {
  draftActions.discard();
  showStatusToast(DISCARDED_DRAFT_TOAST_ID, "Discarded the unfinished event.");
}
