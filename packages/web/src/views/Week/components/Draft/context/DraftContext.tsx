import { createContext } from "react";
import { type Actions_Draft } from "../hooks/actions/useDraftActions";
import { type useDraftConfirmation } from "../hooks/state/useDraftConfirmation";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "../hooks/state/useDraftState";

export type State_Draft = State_Draft_Local;

interface DraftContextValue {
  state: State_Draft;
  setters: Setters_Draft;
  actions: Actions_Draft;
  confirmation: ReturnType<typeof useDraftConfirmation>;
}

export const DraftContext = createContext<DraftContextValue | null>(null);
