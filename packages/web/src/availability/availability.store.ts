import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { type AvailabilitySlot } from "./availability-slot.util";

interface AvailabilityState {
  isOpen: boolean;
  sourceZone: string;
  recipientZone: string | null;
  slots: AvailabilitySlot[];
  activeId: string | null;
  copied: boolean;
  status: "idle" | "loading" | "ready" | "error";
  announcement: string;
}

const initialState: AvailabilityState = {
  isOpen: false,
  sourceZone: "UTC",
  recipientZone: null,
  slots: [],
  activeId: null,
  copied: false,
  status: "idle",
  announcement: "",
};

export const useAvailabilityStore = create<AvailabilityState>()(
  () => initialState,
);

export const availabilityActions = {
  open(slots: AvailabilitySlot[] = []) {
    track("availability_opened");
    const selected = slots.find((slot) => slot.selected) ?? slots[0];
    useAvailabilityStore.setState({
      ...initialState,
      isOpen: true,
      sourceZone: getEffectiveTimeZone(),
      slots,
      activeId: selected?.id ?? null,
    });
  },
  close() {
    const state = useAvailabilityStore.getState();
    if (state.isOpen)
      track("availability_closed", {
        copied: String(state.copied),
        selected_slot_count: String(
          state.slots.filter(({ selected }) => selected).length,
        ),
      });
    useAvailabilityStore.setState(initialState);
  },
  setSlots(slots: AvailabilitySlot[]) {
    const current = useAvailabilityStore.getState();
    useAvailabilityStore.setState({
      slots,
      activeId: slots.some(({ id }) => id === current.activeId)
        ? current.activeId
        : ((slots.find((slot) => slot.selected) ?? slots[0])?.id ?? null),
      status: "ready",
    });
  },
  setStatus(status: AvailabilityState["status"]) {
    useAvailabilityStore.setState({ status });
  },
  announce(announcement: string) {
    useAvailabilityStore.setState({ announcement });
  },
  selectRange(startId: string, endId: string) {
    useAvailabilityStore.setState((state) => {
      const start = state.slots.findIndex(({ id }) => id === startId);
      const end = state.slots.findIndex(({ id }) => id === endId);
      if (start < 0 || end < 0) return state;
      const low = Math.min(start, end);
      const high = Math.max(start, end);
      const day = new Date(state.slots[start]?.start ?? 0).toLocaleDateString(
        "en-CA",
        { timeZone: state.sourceZone },
      );
      return {
        slots: state.slots.map((slot, index) => ({
          ...slot,
          selected:
            slot.selected ||
            (index >= low &&
              index <= high &&
              new Date(slot.start).toLocaleDateString("en-CA", {
                timeZone: state.sourceZone,
              }) === day),
          origin: index >= low && index <= high ? "user" : slot.origin,
        })),
        activeId: endId,
      };
    });
  },
  toggle(id: string) {
    const now = Date.now();
    useAvailabilityStore.setState((state) => ({
      slots: state.slots.map((slot) =>
        slot.id === id && new Date(slot.start).getTime() >= now
          ? { ...slot, selected: !slot.selected, origin: "user" }
          : slot,
      ),
      activeId: id,
    }));
    const slot = useAvailabilityStore
      .getState()
      .slots.find((item) => item.id === id);
    if (slot)
      track("availability_slot_toggled", {
        selected: String(slot.selected),
        origin: slot.origin,
      });
  },
  setActive(activeId: string) {
    useAvailabilityStore.setState({ activeId });
  },
  setRecipientZone(recipientZone: string | null) {
    const { sourceZone } = useAvailabilityStore.getState();
    useAvailabilityStore.setState({
      recipientZone: recipientZone === sourceZone ? null : recipientZone,
    });
    if (recipientZone && recipientZone !== sourceZone)
      track("availability_recipient_zone_added");
  },
  markCopied() {
    useAvailabilityStore.setState({ copied: true });
  },
};

export const selectAvailabilityOpen = (state: AvailabilityState) =>
  state.isOpen;
