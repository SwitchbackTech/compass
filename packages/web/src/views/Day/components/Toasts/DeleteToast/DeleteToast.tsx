import { toast } from "react-toastify";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";

export const DELETE_TOAST_ID = "task-deleted";

export const showDeleteToast = () => {
  // The fixed toastId makes react-toastify dedupe rapid deletions into a
  // single toast; the update refreshes the autoClose timer when the toast
  // already exists (and is a no-op otherwise).
  toast("Deleted", {
    ...toastDefaultOptions,
    toastId: DELETE_TOAST_ID,
    closeButton: false,
    hideProgressBar: true,
  });
  toast.update(DELETE_TOAST_ID, {
    autoClose: toastDefaultOptions.autoClose,
  });

  return DELETE_TOAST_ID;
};
