import { useEffect } from "react";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";
import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";

export function useAvailabilityShortcuts() {
  const state = useAvailabilityStore();
  const enabled = state.isOpen;
  const activeIndex = state.slots.findIndex(({ id }) => id === state.activeId);
  const move = (delta: number) => {
    if (!state.slots.length) return;
    const next =
      state.slots[
        (activeIndex + delta + state.slots.length) % state.slots.length
      ];
    if (next) availabilityActions.setActive(next.id);
  };
  useAppShortcut("ArrowUp", () => move(-1), { enabled });
  useAppShortcut("ArrowDown", () => move(1), { enabled });
  useAppShortcut("ArrowLeft", () => move(-1), { enabled });
  useAppShortcut("ArrowRight", () => move(1), { enabled });
  useAppShortcut(
    "Enter",
    () => state.activeId && availabilityActions.toggle(state.activeId),
    { enabled },
  );
  useAppShortcut(
    "Space",
    () => state.activeId && availabilityActions.toggle(state.activeId),
    { enabled },
  );
  useAppShortcut(
    "Z",
    () =>
      timezoneDialogActions.open(
        undefined,
        "availability-recipient",
        availabilityActions.setRecipientZone,
      ),
    { enabled },
  );
  useAppShortcut("Escape", availabilityActions.close, { enabled });
  useAppShortcut(
    "Mod+C",
    () =>
      document
        .querySelector<HTMLButtonElement>(
          "[aria-label='Copy availability to clipboard']",
        )
        ?.click(),
    { enabled },
  );

  useEffect(() => () => availabilityActions.close(), []);
}
