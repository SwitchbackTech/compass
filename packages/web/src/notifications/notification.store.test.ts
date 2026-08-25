import { createTestNotificationPort } from "@web/__tests__/helpers/web-test-seams";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { registerNotificationPort } from "@web/notifications/notification.port";
import {
  notificationActions,
  resetNotificationStoreForTests,
  selectNotificationsEffectivelyOn,
  useNotificationStore,
} from "@web/notifications/notification.store";
import { beforeEach, describe, expect, it } from "bun:test";

const installPort = (
  options?: Parameters<typeof createTestNotificationPort>[0],
) => {
  const seam = createTestNotificationPort(options);
  registerNotificationPort(seam.port);
  resetNotificationStoreForTests();
  return seam;
};

const isOn = () =>
  selectNotificationsEffectivelyOn(useNotificationStore.getState());

describe("notificationActions.enable", () => {
  beforeEach(() => {
    persistentBrowserStore.remove(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
  });

  it("opts in and persists once the browser grants permission", async () => {
    const seam = installPort({ respondWith: "granted" });

    await notificationActions.enable("palette");

    expect(seam.mocks.requestPermission).toHaveBeenCalled();
    expect(isOn()).toBe(true);
    expect(persistentBrowserStore.get(STORAGE_KEYS.NOTIFICATIONS_ENABLED)).toBe(
      "true",
    );
  });

  it("stays off, and writes nothing, when permission is denied", async () => {
    installPort({ respondWith: "denied" });

    await notificationActions.enable("palette");

    expect(isOn()).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
    ).toBeNull();
  });

  it("stays off when the prompt is dismissed without a choice", async () => {
    installPort({ respondWith: "default" });

    await notificationActions.enable("palette");

    expect(isOn()).toBe(false);
  });

  it("never prompts on a browser without the API", async () => {
    const seam = installPort({ supported: false });

    await notificationActions.enable("palette");

    expect(seam.mocks.requestPermission).not.toHaveBeenCalled();
    expect(isOn()).toBe(false);
  });
});

describe("notificationActions.disable", () => {
  it("clears the pref while leaving the browser grant alone", async () => {
    installPort({ respondWith: "granted" });
    await notificationActions.enable("palette");

    notificationActions.disable("palette");

    expect(isOn()).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
    ).toBeNull();
    expect(useNotificationStore.getState().permission).toBe("granted");
  });
});

describe("permission revoked outside the app", () => {
  it("reads as off once the grant is withdrawn", async () => {
    const seam = installPort({ respondWith: "granted" });
    await notificationActions.enable("palette");
    expect(isOn()).toBe(true);

    seam.setPermission("denied");
    notificationActions.syncPermission();

    // The pref survives, but nothing fires and the UI offers to enable again.
    expect(isOn()).toBe(false);
    expect(useNotificationStore.getState().prefEnabled).toBe(true);
  });
});

describe("store seeding", () => {
  it("re-reads a stored opt-in and the live permission on load", () => {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");

    installPort({ permission: "granted" });

    expect(isOn()).toBe(true);
  });

  it("ignores a stored opt-in the browser no longer backs", () => {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");

    installPort({ permission: "default" });

    expect(isOn()).toBe(false);
  });
});
