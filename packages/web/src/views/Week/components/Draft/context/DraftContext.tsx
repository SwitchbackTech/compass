import { createContext } from "react";
import { type Actions_Draft } from "../hooks/actions/useDraftActions";
import { type useDraftConfirmation } from "../hooks/state/useDraftConfirmation";
import { type useDraftForm } from "../hooks/state/useDraftForm";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "../hooks/state/useDraftState";

export type Props_DraftForm = ReturnType<typeof useDraftForm>;

export interface State_Draft extends State_Draft_Local {
  formProps: Props_DraftForm;
}
interface DraftContextValue {
  state: State_Draft;
  setters: Setters_Draft;
  actions: Actions_Draft;
  confirmation: ReturnType<typeof useDraftConfirmation>;
}

export const DraftContext = createContext<DraftContextValue | null>(null);
