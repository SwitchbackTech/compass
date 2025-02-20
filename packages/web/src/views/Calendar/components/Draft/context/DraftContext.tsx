import { createContext } from "react";

import { Setters_Draft, State_Draft_Local } from "../hooks/state/useDraftState";
import { Actions_Draft } from "../hooks/actions/useDraftActions";
import { Props_DraftForm } from "../hooks/state/useDraftForm";

export interface State_Draft extends State_Draft_Local {
  formProps: Props_DraftForm;
}
interface DraftContextValue {
  state: State_Draft;
  setters: Setters_Draft;
  actions: Actions_Draft;
}

export const DraftContext = createContext<DraftContextValue | null>(null);
