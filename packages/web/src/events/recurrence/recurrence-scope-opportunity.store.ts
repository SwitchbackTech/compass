import { create } from "zustand";
import { type Event } from "@core/types/event.contracts";
import { type ReplaceEventInput } from "@core/types/event-command.contracts";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";

export type RecurrenceScopeOpportunity =
  | {
      id: number;
      kind: "replace";
      original: Event;
      input: ReplaceEventInput;
      source: EventRepositorySource;
      status: "ready" | "requested" | "submitting";
      requestedScope?: "thisAndFollowing" | "all";
    }
  | {
      id: number;
      kind: "delete";
      original: Event;
      source: EventRepositorySource;
      status: "ready" | "requested" | "submitting";
      requestedScope?: "thisAndFollowing" | "all";
    };

type NewRecurrenceScopeOpportunity =
  | Omit<
      Extract<RecurrenceScopeOpportunity, { kind: "replace" }>,
      "id" | "status"
    >
  | Omit<
      Extract<RecurrenceScopeOpportunity, { kind: "delete" }>,
      "id" | "status"
    >;

type RecurrenceScopeOpportunityState = {
  opportunity: RecurrenceScopeOpportunity | null;
  // Occurrence ids whose "Apply to series?" edit ask the user let expire.
  // Session-only: once ignored, that instance is a deliberate one-off and
  // its later edits stop asking. Delete asks never read or write this set.
  declinedEditInstanceIds: Set<string>;
};

let nextOpportunityId = 1;

export const useRecurrenceScopeOpportunityStore =
  create<RecurrenceScopeOpportunityState>()(() => ({
    opportunity: null,
    declinedEditInstanceIds: new Set(),
  }));

const setOpportunity = (opportunity: RecurrenceScopeOpportunity | null) =>
  useRecurrenceScopeOpportunityStore.setState({ opportunity });

// Records an edit ask decline when a live ready replace opportunity ends
// without promotion. Does nothing for delete opportunities or non-ready states.
const recordDeclineIfReadyEdit = (
  current: RecurrenceScopeOpportunity | null,
) => {
  if (!current || current.kind !== "replace" || current.status !== "ready") {
    return;
  }
  useRecurrenceScopeOpportunityStore.setState((state) => ({
    declinedEditInstanceIds: new Set(state.declinedEditInstanceIds).add(
      current.original.id,
    ),
  }));
};

export const recurrenceScopeOpportunityActions = {
  begin: (opportunity: NewRecurrenceScopeOpportunity): number => {
    // Superseding a live edit ask ends it without an answer — same decline as
    // letting the toast expire. No onClose fires here (toast.update swaps the
    // handler), so it must be recorded explicitly.
    recordDeclineIfReadyEdit(
      useRecurrenceScopeOpportunityStore.getState().opportunity,
    );
    const id = nextOpportunityId++;
    setOpportunity({ ...opportunity, id, status: "ready" });
    return id;
  },

  dismiss: (id?: number): void => {
    const current = useRecurrenceScopeOpportunityStore.getState().opportunity;
    if (!current || (id !== undefined && current.id !== id)) return;
    if (current.status !== "ready") return;
    recordDeclineIfReadyEdit(current);
    setOpportunity(null);
  },

  requestPromotion: (id: number, scope: "thisAndFollowing" | "all"): void => {
    useRecurrenceScopeOpportunityStore.setState((state) => {
      const current = state.opportunity;
      if (!current || current.id !== id || current.status !== "ready") {
        return state;
      }
      return {
        opportunity: { ...current, status: "requested", requestedScope: scope },
      };
    });
  },

  claimPromotion: (): RecurrenceScopeOpportunity | null => {
    const current = useRecurrenceScopeOpportunityStore.getState().opportunity;
    if (!current || current.status !== "requested" || !current.requestedScope) {
      return null;
    }
    // Promoting is the opposite of declining: the user chose the series, so
    // drop any stale mark for this instance (a delete ask can promote an
    // instance whose earlier edit ask was ignored).
    useRecurrenceScopeOpportunityStore.setState((state) => {
      if (!state.declinedEditInstanceIds.has(current.original.id)) return state;
      const next = new Set(state.declinedEditInstanceIds);
      next.delete(current.original.id);
      return { declinedEditInstanceIds: next };
    });
    setOpportunity({ ...current, status: "submitting" });
    return current;
  },

  complete: (id: number): void => {
    const current = useRecurrenceScopeOpportunityStore.getState().opportunity;
    if (current?.id === id) setOpportunity(null);
  },

  clear: (): void => setOpportunity(null),

  reset: (): void =>
    useRecurrenceScopeOpportunityStore.setState({
      opportunity: null,
      declinedEditInstanceIds: new Set(),
    }),
};

export const selectRecurrenceScopeOpportunity = (
  state: RecurrenceScopeOpportunityState,
) => state.opportunity;

export const isRecurrenceScopeEditAskDeclined = (instanceId: string): boolean =>
  useRecurrenceScopeOpportunityStore
    .getState()
    .declinedEditInstanceIds.has(instanceId);
