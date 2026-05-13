import { type Dispatch, type SetStateAction, useState } from "react";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export interface State_Draft_Local {
  dateBeingChanged: "startDate" | "endDate" | null;
  draft: Schema_GridEvent | null;
  isResizing: boolean;
  isFormOpen: boolean;
  isFormOpenBeforeDragging: boolean | null;
}

export interface Setters_Draft {
  setIsResizing: (value: boolean) => void;
  setDraft: Dispatch<SetStateAction<Schema_GridEvent | null>>;
  setDateBeingChanged: (value: "startDate" | "endDate" | null) => void;
  setIsFormOpen: (value: boolean) => void;
  setIsFormOpenBeforeDragging: (value: boolean | null) => void;
}

export const useDraftState = () => {
  const [isResizing, setIsResizing] = useState(false);
  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [dateBeingChanged, setDateBeingChanged] = useState<
    "startDate" | "endDate" | null
  >("endDate");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormOpenBeforeDragging, setIsFormOpenBeforeDragging] = useState<
    boolean | null
  >(null);

  const state: State_Draft_Local = {
    draft,
    isFormOpen,
    isResizing,
    dateBeingChanged,
    isFormOpenBeforeDragging,
  };

  const setters: Setters_Draft = {
    setIsResizing,
    setDraft,
    setDateBeingChanged,
    setIsFormOpen,
    setIsFormOpenBeforeDragging,
  };

  return { state, setters };
};
