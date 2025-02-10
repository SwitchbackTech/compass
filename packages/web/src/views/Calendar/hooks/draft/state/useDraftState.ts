import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { useState } from "react";

interface Status_Drag {
  durationMin: number;
  hasMoved?: boolean;
}
interface Status_Resize {
  hasMoved: boolean;
}

export interface State_Draft_Local {
  isDragging: boolean;
  isResizing: boolean;
  draft: Schema_GridEvent | null;
  dragStatus: Status_Drag | null;
  resizeStatus: Status_Resize | null;
  dateBeingChanged: "startDate" | "endDate" | null;
  isFormOpen: boolean;
}

export interface Setters_Draft {
  setIsDragging: (value: boolean) => void;
  setIsResizing: (value: boolean) => void;
  setDraft: (value: Schema_GridEvent | null) => void;
  setDragStatus: (value: Status_Drag | null) => void;
  setResizeStatus: (value: Status_Resize | null) => void;
  setDateBeingChanged: (value: "startDate" | "endDate" | null) => void;
  setIsFormOpen: (value: boolean) => void;
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

  const state: State_Draft_Local = {
    draft,
    dragStatus,
    isDragging,
    isFormOpen,
    isResizing,
    resizeStatus,
    dateBeingChanged,
  };

  const setters: Setters_Draft = {
    setIsDragging,
    setIsResizing,
    setDraft,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setIsFormOpen,
  };

  return { state, setters };
};
