import { Dispatch, SetStateAction, useState } from "react";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export interface Status_Drag {
  durationMin: number;
  hasMoved?: boolean;
}

export interface Status_Resize {
  hasMoved: boolean;
}

export interface State_Draft_Local {
  dateBeingChanged: "startDate" | "endDate" | null;
  draft: Schema_GridEvent | null;
  dragStatus: Status_Drag | null;
  isDragging: boolean;
  isResizing: boolean;
  isFormOpen: boolean;
  isFormOpenBeforeDragging: boolean | null;
  resizeStatus: Status_Resize | null;
}

export interface Setters_Draft {
  setIsDragging: (value: boolean) => void;
  setIsResizing: (value: boolean) => void;
  setDraft: Dispatch<SetStateAction<Schema_GridEvent | null>>;
  setDragStatus: Dispatch<SetStateAction<Status_Drag | null>>;
  setResizeStatus: (value: Status_Resize | null) => void;
  setDateBeingChanged: (value: "startDate" | "endDate" | null) => void;
  setIsFormOpen: (value: boolean) => void;
  setIsFormOpenBeforeDragging: (value: boolean | null) => void;
}

export const useDraftState = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [dragStatus, setDragStatus] = useState<Status_Drag | null>(null);
  const [resizeStatus, setResizeStatus] = useState<Status_Resize | null>(null);
  const [dateBeingChanged, setDateBeingChanged] = useState<
    "startDate" | "endDate" | null
  >("endDate");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormOpenBeforeDragging, setIsFormOpenBeforeDragging] = useState<
    boolean | null
  >(null);

  const state: State_Draft_Local = {
    draft,
    dragStatus,
    isDragging,
    isFormOpen,
    isResizing,
    resizeStatus,
    dateBeingChanged,
    isFormOpenBeforeDragging,
  };

  const setters: Setters_Draft = {
    setIsDragging,
    setIsResizing,
    setDraft,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setIsFormOpen,
    setIsFormOpenBeforeDragging,
  };

  return { state, setters };
};
