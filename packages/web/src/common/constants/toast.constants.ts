import { type Id, type ToastOptions } from "react-toastify";
import { c } from "@web/common/styles/colors";
import { theme } from "@web/common/styles/theme";

export const GOOGLE_REVOKED_TOAST_ID: Id = "google-revoked-api";
export const GOOGLE_REPAIR_FAILED_TOAST_ID: Id = "google-repair-failed";
export const TASK_DELETED_TOAST_ID: Id = "task-deleted";
export const TASK_MIGRATION_TOAST_ID: Id = "task-migration";

export const toastDefaultOptions: ToastOptions = {
  autoClose: 5000,
  position: "bottom-left",
  closeOnClick: true,
  theme: "dark",
  style: {
    backgroundColor: theme.color.bg.primary,
    color: theme.color.text.lighter,
    boxShadow: `0 4px 12px ${c.gray900}`,
  },
  progressStyle: {
    background: c.gray200,
  },
};
