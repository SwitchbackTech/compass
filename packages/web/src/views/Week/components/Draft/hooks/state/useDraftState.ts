import { type Dispatch, type SetStateAction, useState } from "react";
import { type GridEventDraft } from "@web/events/event-draft.types";

export interface Status_Drag {
  durationMin: number;
  hasMoved?: boolean;
}

export interface Status_Resize {
  hasMoved: boolean;
}

export interface DragOffset {
  x: number;
  y: number;
}

export interface State_Draft_Local {
  dateBeingChanged: "startDate" | "endDate" | null;
  draft: GridEventDraft | null;
  draftSessionKey: number;
  dragOffset: DragOffset;
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
  setDraft: Dispatch<SetStateAction<GridEventDraft | null>>;
  setDragOffset: Dispatch<SetStateAction<DragOffset>>;
  setDragStatus: Dispatch<SetStateAction<Status_Drag | null>>;
  setResizeStatus: (value: Status_Resize | null) => void;
  setDateBeingChanged: (value: "startDate" | "endDate" | null) => void;
  setDraftSessionKey: Dispatch<SetStateAction<number>>;
  setIsFormOpen: (value: boolean) => void;
  setIsFormOpenBeforeDragging: (value: boolean | null) => void;
}

const ZERO_DRAG_OFFSET: DragOffset = { x: 0, y: 0 };

export const useDraftState = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draft, setDraft] = useState<GridEventDraft | null>(null);
  // Mid-drag cursor-offset (pixels between the pointer and the dragged
  // event's origin), populated only while a mouse-drag is active. Kept as a
  // sibling to `draft` rather than folded into it: `GridEventDraft` is the
  // persisted-shape contract (dates + form fields) and has no grid-layout
  // concept of a cursor offset.
  const [dragOffset, setDragOffset] = useState<DragOffset>(ZERO_DRAG_OFFSET);
  const [draftSessionKey, setDraftSessionKey] = useState(0);
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
    draftSessionKey,
    dragOffset,
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
    setDragOffset,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setDraftSessionKey,
    setIsFormOpen,
    setIsFormOpenBeforeDragging,
  };

  return { state, setters };
};
