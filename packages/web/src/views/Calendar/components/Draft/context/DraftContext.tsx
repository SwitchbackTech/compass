import { createContext } from "react";

import { Setters_Draft } from "../hooks/state/useDraftState";
import { State_Draft } from "../hooks/useDraft";
import { useDraftActions } from "../hooks/actions/useDraftActions";

interface DraftContextValue {
  state: State_Draft;
  setters: Setters_Draft;
  actions: ReturnType<typeof useDraftActions>;
}

export const DraftContext = createContext<DraftContextValue | null>(null);
