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
};

let nextOpportunityId = 1;

export const useRecurrenceScopeOpportunityStore =
  create<RecurrenceScopeOpportunityState>()(() => ({ opportunity: null }));

const setOpportunity = (opportunity: RecurrenceScopeOpportunity | null) =>
  useRecurrenceScopeOpportunityStore.setState({ opportunity });

export const recurrenceScopeOpportunityActions = {
  begin: (opportunity: NewRecurrenceScopeOpportunity): number => {
    const id = nextOpportunityId++;
    setOpportunity({ ...opportunity, id, status: "ready" });
    return id;
  },

  dismiss: (id?: number): void => {
    const current = useRecurrenceScopeOpportunityStore.getState().opportunity;
    if (!current || (id !== undefined && current.id !== id)) return;
    if (current.status !== "ready") return;
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
    setOpportunity({ ...current, status: "submitting" });
    return current;
  },

  complete: (id: number): void => {
    const current = useRecurrenceScopeOpportunityStore.getState().opportunity;
    if (current?.id === id) setOpportunity(null);
  },

  clear: (): void => setOpportunity(null),
};

export const selectRecurrenceScopeOpportunity = (
  state: RecurrenceScopeOpportunityState,
) => state.opportunity;
