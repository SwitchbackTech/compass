import { toast } from "react-toastify";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";

export const MIGRATION_TOAST_ID = "task-migration";

export const showMigrationToast = (direction: "forward" | "backward") => {
  const message = `Migrated ${direction}`;

  // The fixed toastId makes react-toastify dedupe rapid migrations into a
  // single toast; the update refreshes the message and autoClose timer when
  // the toast already exists (and is a no-op otherwise).
  toast(message, {
    ...toastDefaultOptions,
    toastId: MIGRATION_TOAST_ID,
    closeButton: false,
    hideProgressBar: true,
  });
  toast.update(MIGRATION_TOAST_ID, {
    render: message,
    autoClose: toastDefaultOptions.autoClose,
  });

  return MIGRATION_TOAST_ID;
};
