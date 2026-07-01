import type React from "react";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export const TASK_LIST_DEFAULT_WIDTH = 360;
export const TASK_LIST_MIN_WIDTH = 240;
export const TASK_LIST_MAX_WIDTH = 600;
// Matches the calendar grid's min-w-xs so a drag can never squeeze it below
// its own minimum.
const CALENDAR_MIN_WIDTH = 320;
const KEYBOARD_STEP = 16;

const clampWidth = (width: number) =>
  Math.min(TASK_LIST_MAX_WIDTH, Math.max(TASK_LIST_MIN_WIDTH, width));

const readStoredWidth = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAY_TASK_LIST_WIDTH);
    if (raw === null) return TASK_LIST_DEFAULT_WIDTH;
    const parsed = z.coerce.number().int().safeParse(raw);
    if (!parsed.success) return TASK_LIST_DEFAULT_WIDTH;
    return clampWidth(parsed.data);
  } catch {
    return TASK_LIST_DEFAULT_WIDTH;
  }
};

const persistWidth = (width: number) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DAY_TASK_LIST_WIDTH, String(width));
  } catch {
    // Persistence is best-effort; resizing still works for the session.
  }
};

export function useResizableTaskList() {
  const [width, setWidth] = useState(readStoredWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  // Synced in the handlers rather than on render: pointermove state updates
  // are batched asynchronously, so a render-time sync would let pointerup
  // persist a stale width.
  const widthRef = useRef(width);

  const applyWidth = useCallback((next: number) => {
    widthRef.current = next;
    setWidth(next);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startWidth: widthRef.current };
    setIsResizing(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;

    const divider = e.currentTarget;
    const container = divider.parentElement;
    const dynamicMax = container
      ? container.clientWidth - CALENDAR_MIN_WIDTH - divider.offsetWidth
      : TASK_LIST_MAX_WIDTH;
    const next =
      dragRef.current.startWidth + (e.clientX - dragRef.current.startX);

    applyWidth(
      Math.max(TASK_LIST_MIN_WIDTH, Math.min(clampWidth(next), dynamicMax)),
    );
  }, [applyWidth]);

  const endResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsResizing(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    persistWidth(widthRef.current);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = widthRef.current - KEYBOARD_STEP;
        break;
      case "ArrowRight":
        next = widthRef.current + KEYBOARD_STEP;
        break;
      case "Home":
        next = TASK_LIST_MIN_WIDTH;
        break;
      case "End":
        next = TASK_LIST_MAX_WIDTH;
        break;
      case "Enter":
        next = TASK_LIST_DEFAULT_WIDTH;
        break;
      default:
        return;
    }

    e.preventDefault();
    const clamped = clampWidth(next);
    applyWidth(clamped);
    persistWidth(clamped);
  }, [applyWidth]);

  const onDoubleClick = useCallback(() => {
    applyWidth(TASK_LIST_DEFAULT_WIDTH);
    persistWidth(TASK_LIST_DEFAULT_WIDTH);
  }, [applyWidth]);

  return {
    width,
    isResizing,
    dividerProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endResize,
      onPointerCancel: endResize,
      onKeyDown,
      onDoubleClick,
    },
  };
}
