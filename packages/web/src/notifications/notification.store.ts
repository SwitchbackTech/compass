import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { track } from "@web/auth/posthog/track";
import { IS_DEV } from "@web/common/constants/env.constants";
import { NOTIFICATIONS_STATUS_TOAST_ID } from "@web/common/constants/toast.constants";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { getNotificationPort } from "@web/notifications/notification.port";
import {
  isNotificationsPrefEnabled,
  persistNotificationsPref,
} from "@web/notifications/notification.storage";

/** Where a toggle came from, so the funnel can tell the two surfaces apart. */
export type NotificationToggleSource = "palette" | "showcase";

export interface NotificationState {
  /** The app-level opt-in. Only ever true after a grant (see enable). */
  prefEnabled: boolean;
  /** Mirror of the browser permission, resynced on focus and on change. */
  permission: NotificationPermission;
}

const readInitialState = (): NotificationState => ({
  prefEnabled: isNotificationsPrefEnabled(),
  permission: getNotificationPort().getPermission(),
});

export const useNotificationStore = create<NotificationState>()(
  devtools(readInitialState, {
    name: "compass/notifications",
    enabled: IS_DEV,
  }),
);

const setPref = (prefEnabled: boolean, type: string) => {
  persistNotificationsPref(prefEnabled);
  useNotificationStore.setState({ prefEnabled }, false, { type });
};

export const notificationActions = {
  /**
   * Ask the browser, then opt in only on a grant. Keeping the pref and the
   * permission in lockstep means there is no "on but silent" state to explain.
   */
  enable: async (source: NotificationToggleSource): Promise<void> => {
    const port = getNotificationPort();
    if (!port.isSupported()) return;

    const permission = await port.requestPermission();
    useNotificationStore.setState({ permission }, false, {
      type: "syncPermission",
    });

    if (permission === "granted") {
      setPref(true, "enable");
      showStatusToast(
        NOTIFICATIONS_STATUS_TOAST_ID,
        "Event notifications on. You'll get a heads-up 5 minutes before each event.",
      );
      track("notifications_enabled", { source });
      return;
    }

    if (permission === "denied") {
      // The browser will not prompt again for this origin, so point at the
      // only place that can undo it.
      showStatusToast(
        NOTIFICATIONS_STATUS_TOAST_ID,
        "Notifications are blocked for this site. Allow them in your browser's site settings, then try again.",
      );
      track("notifications_enable_denied", { source });
    }
    // "default" means the prompt was dismissed without a choice: stay quiet,
    // the user can ask again.
  },

  disable: (source: NotificationToggleSource): void => {
    setPref(false, "disable");
    showStatusToast(NOTIFICATIONS_STATUS_TOAST_ID, "Event notifications off.");
    track("notifications_disabled", { source });
  },

  /**
   * Re-read the opt-in after another tab wrote it. Without this, turning
   * notifications off in one tab would leave every other open tab still
   * firing them until it reloaded.
   */
  syncPrefFromStorage: (): void => {
    const prefEnabled = isNotificationsPrefEnabled();
    if (prefEnabled === useNotificationStore.getState().prefEnabled) return;
    useNotificationStore.setState({ prefEnabled }, false, {
      type: "syncPrefFromStorage",
    });
  },

  /** Re-read the browser permission (revoking it happens outside the app). */
  syncPermission: (): void => {
    const permission = getNotificationPort().getPermission();
    if (permission === useNotificationStore.getState().permission) return;
    useNotificationStore.setState({ permission }, false, {
      type: "syncPermission",
    });
  },
};

/**
 * The only state worth acting on: opted in, still granted, still supported.
 * A revoked grant reads as off everywhere without a separate stuck state.
 */
export const selectNotificationsEffectivelyOn = (
  state: NotificationState,
): boolean => state.prefEnabled && state.permission === "granted";

export function resetNotificationStoreForTests(): void {
  useNotificationStore.setState(readInitialState(), true);
}
