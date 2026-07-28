import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  draftActions,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { lockGlobalCursor } from "@web/interaction/dom/cursor.lock";

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
  /** Canonical draft values from Zustand — sole owner for portal and form. */
  draft: GridEventDraft | null;
  dragOffset: DragOffset;
  dragStatus: Status_Drag | null;
  /**
   * Snapshot of the draft at resize-gesture start. Resize math freezes against
   * this so live store updates mid-gesture do not shift the baseline.
   */
  gestureOriginDraft: GridEventDraft | null;
  isDragging: boolean;
  isResizing: boolean;
  isFormOpen: boolean;
  /**
   * Gesture policy: whether the form was open when drag began. Used by submit
   * to reopen the form instead of persisting; not a second draft copy.
   */
  isFormOpenBeforeDragging: boolean | null;
  resizeStatus: Status_Resize | null;
}

export interface Setters_Draft {
  setIsDragging: (value: boolean) => void;
  setIsResizing: (value: boolean) => void;
  setDragOffset: Dispatch<SetStateAction<DragOffset>>;
  setDragStatus: Dispatch<SetStateAction<Status_Drag | null>>;
  setGestureOriginDraft: Dispatch<SetStateAction<GridEventDraft | null>>;
  setResizeStatus: (value: Status_Resize | null) => void;
  setDateBeingChanged: (value: "startDate" | "endDate" | null) => void;
  setIsFormOpen: (value: boolean) => void;
  setIsFormOpenBeforeDragging: (value: boolean | null) => void;
}

const ZERO_DRAG_OFFSET: DragOffset = { x: 0, y: 0 };

export const useDraftState = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Force the `move` cursor while dragging a draft, via the same global lock
  // the engine uses. Callers only toggle `setIsDragging`; the cursor follows.
  // The lock is released when the drag stops or the component unmounts.
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    return lockGlobalCursor("move");
  }, [isDragging]);

  // Mid-drag cursor-offset (pixels between the pointer and the dragged
  // event's origin), populated only while a mouse-drag is active. Kept as
  // gesture ephemera rather than folded into the draft: `GridEventDraft` is
  // the persisted-shape contract (dates + form fields) and has no grid-layout
  // concept of a cursor offset.
  const [dragOffset, setDragOffset] = useState<DragOffset>(ZERO_DRAG_OFFSET);
  const [dragStatus, setDragStatus] = useState<Status_Drag | null>(null);
  const [resizeStatus, setResizeStatus] = useState<Status_Resize | null>(null);
  const [gestureOriginDraft, setGestureOriginDraft] =
    useState<GridEventDraft | null>(null);
  const [dateBeingChanged, setDateBeingChanged] = useState<
    "startDate" | "endDate" | null
  >("endDate");
  // Form-open lives in the draft store (not local state) so the shared
  // Sidebar can swap its body for the event-details panel from any
  // view. Week reads/writes it through the same shape as the old useState
  // pair.
  const isFormOpen = useDraftStore((state) =>
    Boolean(state.status?.isFormOpen),
  );
  const setIsFormOpen = draftActions.setFormOpen;
  const [isFormOpenBeforeDragging, setIsFormOpenBeforeDragging] = useState<
    boolean | null
  >(null);

  const draft = useDraftStore(selectGridDraft);

  const state: State_Draft_Local = {
    draft,
    dragOffset,
    dragStatus,
    gestureOriginDraft,
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
    setDragOffset,
    setDragStatus,
    setGestureOriginDraft,
    setResizeStatus,
    setDateBeingChanged,
    setIsFormOpen,
    setIsFormOpenBeforeDragging,
  };

  return { state, setters };
};
