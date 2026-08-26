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
  const moveHorizontal = (delta: -1 | 1) => {
    const active = state.slots[activeIndex];
    if (!active) return;
    const activeDate = new Date(active.start);
    const activeDay = activeDate.toLocaleDateString("en-CA", {
      timeZone: state.sourceZone,
    });
    const activeMinutes = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: state.sourceZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .format(activeDate)
        .replace(":", ""),
    );
    const days = [
      ...new Set(
        state.slots.map((slot) =>
          new Date(slot.start).toLocaleDateString("en-CA", {
            timeZone: state.sourceZone,
          }),
        ),
      ),
    ];
    const dayIndex = days.indexOf(activeDay);
    const targetDay = days[dayIndex + delta];
    if (!targetDay) return;
    const nearest = state.slots
      .filter(
        (slot) =>
          new Date(slot.start).toLocaleDateString("en-CA", {
            timeZone: state.sourceZone,
          }) === targetDay,
      )
      .sort((a, b) => {
        const value = (slot: typeof a) =>
          Number(
            new Intl.DateTimeFormat("en-US", {
              timeZone: state.sourceZone,
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            })
              .format(new Date(slot.start))
              .replace(":", ""),
          );
        return (
          Math.abs(value(a) - activeMinutes) -
          Math.abs(value(b) - activeMinutes)
        );
      })[0];
    if (nearest) availabilityActions.setActive(nearest.id);
  };
  useAppShortcut("ArrowUp", () => move(-1), { enabled });
  useAppShortcut("ArrowDown", () => move(1), { enabled });
  useAppShortcut("ArrowLeft", () => moveHorizontal(-1), { enabled });
  useAppShortcut("ArrowRight", () => moveHorizontal(1), { enabled });
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
