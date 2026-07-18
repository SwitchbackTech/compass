import { type Id, type ToastOptions } from "react-toastify";
import { colors } from "@web/common/styles/colors";

export const EVENT_DELETED_TOAST_ID: Id = "event-deleted";
export const GOOGLE_REVOKED_TOAST_ID: Id = "google-revoked-api";
export const GOOGLE_REPAIR_FAILED_TOAST_ID: Id = "google-repair-failed";
export const SUBSCRIBE_TO_UPDATES_TOAST_ID: Id = "subscribe-to-updates";
export const EXPORT_MY_DATA_TOAST_ID: Id = "export-my-data";

export const toastDefaultOptions: ToastOptions = {
  autoClose: 5000,
  position: "bottom-left",
  closeOnClick: true,
  theme: "dark",
  style: {
    backgroundColor: colors.background,
    color: colors.text,
    boxShadow: "0 4px 12px hsl(0 0 0 / 50%)",
  },
  progressStyle: {
    background: colors.textMuted,
  },
};
