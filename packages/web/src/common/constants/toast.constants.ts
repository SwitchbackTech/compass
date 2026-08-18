import { type Id, type ToastOptions } from "react-toastify";
import { colors, lightColors } from "@web/common/styles/colors";
import { type ThemeName } from "@web/settings/theme/theme.constants";
import { useThemeStore } from "@web/settings/theme/theme.store";

export const EVENT_DELETED_TOAST_ID: Id = "event-deleted";
export const UNDO_DECLINED_TOAST_ID: Id = "undo-declined";
export const GENERIC_ERROR_TOAST_ID: Id = "generic-error";
export const GOOGLE_REVOKED_TOAST_ID: Id = "google-revoked-api";
export const GOOGLE_REPAIR_FAILED_TOAST_ID: Id = "google-repair-failed";
export const GOOGLE_CONNECT_FAILED_TOAST_ID: Id = "google-connect-failed";
export const GOOGLE_REFRESH_FAILED_TOAST_ID: Id = "google-refresh-failed";
export const GOOGLE_REFRESH_ALREADY_IN_FLIGHT_TOAST_ID: Id =
  "google-refresh-already-in-flight";
export const GOOGLE_DELAYED_TOAST_ID: Id = "google-delayed";
export const ACCOUNT_DISCONNECTED_TOAST_ID: Id = "account-disconnected";
export const EXPORT_MY_DATA_TOAST_ID: Id = "export-my-data";
export const LOGGED_OUT_TOAST_ID: Id = "logged-out";
export const EVENT_SAVE_UNAVAILABLE_TOAST_ID: Id = "event-save-unavailable";

const toastPalette: Record<
  ThemeName,
  { background: string; text: string; textMuted: string; shadow: string }
> = {
  "dark-abyss": {
    background: colors.background,
    text: colors.text,
    textMuted: colors.textMuted,
    shadow: "0 4px 12px hsl(0 0 0 / 50%)",
  },
  "light-beach": {
    background: lightColors.background,
    text: lightColors.text,
    textMuted: lightColors.textMuted,
    shadow: "0 4px 12px hsl(40 25% 25% / 18%)",
  },
};

/** Theme-aware toast defaults. Read the store at call time so toasts match the active palette. */
export function getToastDefaultOptions(
  theme: ThemeName = useThemeStore.getState().theme,
): ToastOptions {
  const palette = toastPalette[theme];

  return {
    autoClose: 5000,
    position: "bottom-left",
    closeOnClick: true,
    theme: theme === "dark-abyss" ? "dark" : "light",
    style: {
      backgroundColor: palette.background,
      color: palette.text,
      boxShadow: palette.shadow,
    },
    progressStyle: {
      background: palette.textMuted,
    },
  };
}
