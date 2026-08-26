import { create } from "zustand";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { type AvailabilitySlot } from "./availability-slot.util";

interface AvailabilityState {
  isOpen: boolean;
  sourceZone: string;
  recipientZone: string | null;
  slots: AvailabilitySlot[];
  activeId: string | null;
  copied: boolean;
}

const initialState: AvailabilityState = {
  isOpen: false,
  sourceZone: "UTC",
  recipientZone: null,
  slots: [],
  activeId: null,
  copied: false,
};

export const useAvailabilityStore = create<AvailabilityState>()(
  () => initialState,
);

export const availabilityActions = {
  open(slots: AvailabilitySlot[] = []) {
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
    useAvailabilityStore.setState(initialState);
  },
  setSlots(slots: AvailabilitySlot[]) {
    const current = useAvailabilityStore.getState();
    useAvailabilityStore.setState({
      slots,
      activeId: slots.some(({ id }) => id === current.activeId)
        ? current.activeId
        : ((slots.find((slot) => slot.selected) ?? slots[0])?.id ?? null),
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
  },
  setActive(activeId: string) {
    useAvailabilityStore.setState({ activeId });
  },
  setRecipientZone(recipientZone: string | null) {
    const { sourceZone } = useAvailabilityStore.getState();
    useAvailabilityStore.setState({
      recipientZone: recipientZone === sourceZone ? null : recipientZone,
    });
  },
  markCopied() {
    useAvailabilityStore.setState({ copied: true });
  },
};

export const selectAvailabilityOpen = (state: AvailabilityState) =>
  state.isOpen;
