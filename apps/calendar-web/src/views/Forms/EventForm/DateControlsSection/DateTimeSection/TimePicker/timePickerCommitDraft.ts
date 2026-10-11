export const TIME_PICKER_COMMIT_DRAFT_EVENT =
  "compass:commit-time-picker-draft";

/** Commit a focused time picker's uncommitted draft before form-level save. */
export const commitFocusedTimePickerDraft = (
  activeElement: Element | null | undefined,
) => {
  const picker = activeElement?.closest(".c-time-picker");
  if (!picker) return;
  picker.dispatchEvent(
    new Event(TIME_PICKER_COMMIT_DRAFT_EVENT, { bubbles: false }),
  );
};
