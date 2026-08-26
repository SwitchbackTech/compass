import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import {
  type AvailabilitySlot,
  stepAvailabilityCandidateByDay,
  stepAvailabilityCandidateByTime,
} from "./availability-slot.util";

export interface AvailabilityState {
  isOpen: boolean;
  sourceZone: string;
  recipientZone: string | null;
  /**
   * Every free block in the visible range. This stays the single source of
   * truth for what is offerable; `pickIds` is a view onto it, so repositioning
   * can never land on busy time.
   */
  slots: AvailabilitySlot[];
  /** Candidate ids currently offered, in the order they were placed. */
  pickIds: string[];
  /** Which pick the grid focus and the arrow keys act on. */
  activePickIndex: number;
  /** Picks the user pressed Enter on - styling and progress only. */
  acceptedIds: string[];
  copied: boolean;
  status: "idle" | "loading" | "ready" | "error";
  announcement: string;
}

export const initialAvailabilityState: AvailabilityState = {
  isOpen: false,
  sourceZone: "UTC",
  recipientZone: null,
  slots: [],
  pickIds: [],
  activePickIndex: 0,
  acceptedIds: [],
  copied: false,
  status: "idle",
  announcement: "",
};

export const useAvailabilityStore = create<AvailabilityState>()(
  () => initialAvailabilityState,
);

const pickIdsFrom = (slots: readonly AvailabilitySlot[]) =>
  slots.filter(({ selected }) => selected).map(({ id }) => id);

/** `selected` is derived from `pickIds` so the two can never disagree. */
const withSelection = (
  slots: readonly AvailabilitySlot[],
  pickIds: readonly string[],
): AvailabilitySlot[] => {
  const picked = new Set(pickIds);
  return slots.map((slot) => ({ ...slot, selected: picked.has(slot.id) }));
};

/** Picks in chronological order - the order the message reads in. */
const sortPickIds = (
  pickIds: readonly string[],
  slots: readonly AvailabilitySlot[],
) => {
  const order = new Map(slots.map(({ id }, index) => [id, index]));
  return [...pickIds].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
};

const replaceActivePick = (
  state: AvailabilityState,
  next: AvailabilitySlot | null,
) => {
  if (!next) return state;
  const current = state.pickIds[state.activePickIndex];
  if (!current) return state;
  const pickIds = sortPickIds(
    state.pickIds.map((id) => (id === current ? next.id : id)),
    state.slots,
  );
  return {
    ...state,
    pickIds,
    slots: withSelection(state.slots, pickIds),
    // A pick that moves past its neighbour keeps focus by following its id.
    activePickIndex: pickIds.indexOf(next.id),
    acceptedIds: state.acceptedIds.map((id) => (id === current ? next.id : id)),
  };
};

const stepOptions = (state: AvailabilityState) => ({
  slots: state.slots,
  fromId: state.pickIds[state.activePickIndex] ?? "",
  taken: state.pickIds.filter((_, index) => index !== state.activePickIndex),
  timeZone: state.sourceZone,
});

export const availabilityActions = {
  open(slots: AvailabilitySlot[] = []) {
    track("availability_opened");
    const pickIds = pickIdsFrom(slots);
    useAvailabilityStore.setState({
      ...initialAvailabilityState,
      isOpen: true,
      sourceZone: getEffectiveTimeZone(),
      slots,
      pickIds,
    });
  },
  close() {
    const state = useAvailabilityStore.getState();
    if (state.isOpen)
      track("availability_closed", {
        copied: String(state.copied),
        selected_slot_count: String(state.pickIds.length),
      });
    useAvailabilityStore.setState(initialAvailabilityState);
  },
  /**
   * A refetch rebuilds the candidate list. Picks that are still free are
   * carried over by id; the caller announces any that were dropped.
   */
  setSlots(slots: AvailabilitySlot[]) {
    useAvailabilityStore.setState((state) => {
      const available = new Set(slots.map(({ id }) => id));
      const carried = state.pickIds.filter((id) => available.has(id));
      const pickIds = sortPickIds(
        carried.length ? carried : pickIdsFrom(slots),
        slots,
      );
      return {
        slots: withSelection(slots, pickIds),
        pickIds,
        activePickIndex: Math.min(
          state.activePickIndex,
          Math.max(0, pickIds.length - 1),
        ),
        acceptedIds: state.acceptedIds.filter((id) => pickIds.includes(id)),
        status: "ready",
      };
    });
  },
  setStatus(status: AvailabilityState["status"]) {
    useAvailabilityStore.setState({ status });
  },
  announce(announcement: string) {
    useAvailabilityStore.setState({ announcement });
  },
  /** Reposition the active pick to the previous/next free block. */
  movePickByTime(delta: -1 | 1) {
    useAvailabilityStore.setState((state) =>
      replaceActivePick(
        state,
        stepAvailabilityCandidateByTime(delta, stepOptions(state)),
      ),
    );
  },
  /** Reposition the active pick to the nearest free block a day away. */
  movePickByDay(delta: -1 | 1) {
    useAvailabilityStore.setState((state) =>
      replaceActivePick(
        state,
        stepAvailabilityCandidateByDay(delta, stepOptions(state)),
      ),
    );
  },
  /**
   * Accept the active pick and advance. Returns true when the last pick was
   * accepted, so the caller can move focus on to Copy.
   */
  acceptPick(): boolean {
    const state = useAvailabilityStore.getState();
    const active = state.pickIds[state.activePickIndex];
    if (!active) return true;
    const isLast = state.activePickIndex >= state.pickIds.length - 1;
    useAvailabilityStore.setState({
      acceptedIds: state.acceptedIds.includes(active)
        ? state.acceptedIds
        : [...state.acceptedIds, active],
      activePickIndex: isLast
        ? state.activePickIndex
        : state.activePickIndex + 1,
    });
    track("availability_slot_accepted", {
      accepted_count: String(state.acceptedIds.length + 1),
    });
    return isLast;
  },
  /** Tab / Shift+Tab between picks. Stops at the ends rather than wrapping. */
  focusPick(delta: -1 | 1) {
    useAvailabilityStore.setState((state) => ({
      activePickIndex: Math.min(
        Math.max(state.activePickIndex + delta, 0),
        Math.max(0, state.pickIds.length - 1),
      ),
    }));
  },
  setActivePickIndex(activePickIndex: number) {
    useAvailabilityStore.setState({ activePickIndex });
  },
  /** Offer one more time, placed on the first free block no pick holds. */
  addPick() {
    useAvailabilityStore.setState((state) => {
      const held = new Set(state.pickIds);
      const now = Date.now();
      const next = state.slots.find(
        (slot) => !held.has(slot.id) && Date.parse(slot.start) >= now,
      );
      if (!next) return { announcement: "No other free times are available." };
      const pickIds = sortPickIds([...state.pickIds, next.id], state.slots);
      return {
        pickIds,
        slots: withSelection(state.slots, pickIds),
        activePickIndex: pickIds.indexOf(next.id),
        announcement: `Added a time. Offering ${pickIds.length}.`,
      };
    });
    track("availability_slot_added");
  },
  /** Drop the focused pick. The last one stays - an empty offer is useless. */
  removePick() {
    useAvailabilityStore.setState((state) => {
      const active = state.pickIds[state.activePickIndex];
      if (!active || state.pickIds.length <= 1)
        return { announcement: "Keep at least one time to share." };
      const pickIds = state.pickIds.filter((id) => id !== active);
      return {
        pickIds,
        slots: withSelection(state.slots, pickIds),
        activePickIndex: Math.min(state.activePickIndex, pickIds.length - 1),
        acceptedIds: state.acceptedIds.filter((id) => id !== active),
        announcement: `Removed a time. Offering ${pickIds.length}.`,
      };
    });
    track("availability_slot_removed");
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

/**
 * Plain helper, not a hook selector: it builds a new array each call, which
 * would re-render forever through `useAvailabilityStore(selector)` (see the
 * useShallow note in events/stores/draft.store.ts). Callers already subscribe
 * to the whole store, so they derive picks through `useMemo` instead.
 */
export const getAvailabilityPicks = (
  state: Pick<AvailabilityState, "pickIds" | "slots">,
): AvailabilitySlot[] =>
  state.pickIds.flatMap(
    (id) => state.slots.find((slot) => slot.id === id) ?? [],
  );

export const getActivePickId = (
  state: Pick<AvailabilityState, "pickIds" | "activePickIndex">,
): string | null => state.pickIds[state.activePickIndex] ?? null;
