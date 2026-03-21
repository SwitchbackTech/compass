import { type RegisterableHotkey, useHotkey } from "@tanstack/react-hotkeys";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";

export interface UseAppHotkeyOptions {
  enabled?: boolean;
  ignoreInputs?: boolean;
  blurOnTrigger?: boolean;
  eventType?: "keydown" | "keyup";
}

function getHotkeyPlatform(): "linux" | "mac" | "windows" | undefined {
  switch (getDesktopOS()) {
    case DesktopOS.MacOS:
      return "mac";
    case DesktopOS.Windows:
      return "windows";
    case DesktopOS.Linux:
      return "linux";
    default:
      return undefined;
  }
}

export function useAppHotkey(
  hotkey: RegisterableHotkey,
  handler: (event: KeyboardEvent) => void,
  options: UseAppHotkeyOptions = {},
) {
  const {
    enabled = true,
    ignoreInputs,
    blurOnTrigger = false,
    eventType = "keydown",
  } = options;

  useHotkey(
    hotkey,
    (event) => {
      if (document.body.dataset.appLocked === "true") {
        return;
      }

      if (blurOnTrigger) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }

      handler(event);
    },
    {
      enabled,
      ignoreInputs,
      eventType,
      platform: getHotkeyPlatform(),
    },
  );
}

export const useAppHotkeyUp = (
  hotkey: RegisterableHotkey,
  handler: (event: KeyboardEvent) => void,
  options?: Omit<UseAppHotkeyOptions, "eventType">,
) => useAppHotkey(hotkey, handler, { ...options, eventType: "keyup" });
