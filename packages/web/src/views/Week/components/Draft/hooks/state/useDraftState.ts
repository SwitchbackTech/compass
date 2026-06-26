import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { setIsDraggingEvent } from "@web/common/calendar-interaction/dom/cursor/eventDragCursorState";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

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
  draftSessionKey: number;
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
  setDraftSessionKey: Dispatch<SetStateAction<number>>;
  setIsFormOpen: (value: boolean) => void;
  setIsFormOpenBeforeDragging: (value: boolean | null) => void;
}

export const useDraftState = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Mirror the draft drag state into the shared cursor signal so the `move`
  // cursor is driven from a single place (useEventDragCursor). Callers only
  // toggle `setIsDragging`; the signal follows automatically. The equality
  // guard in setIsDraggingEvent makes the cleanup re-set a no-op.
  useEffect(() => {
    setIsDraggingEvent(isDragging);

    return () => setIsDraggingEvent(false);
  }, [isDragging]);

  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
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
    setDraftSessionKey,
    setIsFormOpen,
    setIsFormOpenBeforeDragging,
  };

  return { state, setters };
};
