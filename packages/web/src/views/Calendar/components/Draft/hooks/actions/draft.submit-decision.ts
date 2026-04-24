export type DraftSubmitAction = "CREATE" | "DISCARD" | "OPEN_FORM" | "UPDATE";

type DraftIdentity = {
  _id?: string | null;
  [key: string]: unknown;
};

interface Params_GetDraftSubmitAction {
  draft: DraftIdentity;
  pendingEventIds: string[];
  isFormOpenBeforeDragging: boolean | null;
  isDirty: boolean;
}

export const getDraftSubmitAction = ({
  draft,
  pendingEventIds,
  isFormOpenBeforeDragging,
  isDirty,
}: Params_GetDraftSubmitAction): DraftSubmitAction => {
  if (!draft._id) return "CREATE";

  if (pendingEventIds.includes(draft._id)) return "DISCARD";

  if (isFormOpenBeforeDragging) return "OPEN_FORM";

  if (!isDirty) return "DISCARD";

  return "UPDATE";
};
