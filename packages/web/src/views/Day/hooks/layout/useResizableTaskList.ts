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

const clampDragWidth = (width: number, dynamicMax: number) =>
  Math.max(
    TASK_LIST_MIN_WIDTH,
    Math.min(width, TASK_LIST_MAX_WIDTH, dynamicMax),
  );

const KEYBOARD_WIDTHS = {
  End: TASK_LIST_MAX_WIDTH,
  Enter: TASK_LIST_DEFAULT_WIDTH,
  Home: TASK_LIST_MIN_WIDTH,
} as const;

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
  const dragRef = useRef<{
    startX: number;
    startWidth: number;
    dynamicMax: number;
  } | null>(null);
  // Tracked in a ref, not read from render: pointermove state updates are
  // batched asynchronously, so pointerup would otherwise persist a stale width.
  const widthRef = useRef(width);

  const applyWidth = useCallback((next: number) => {
    widthRef.current = next;
    setWidth(next);
  }, []);

  // Clamp, apply, and persist in one step — shared by keyboard and reset paths.
  const commitWidth = useCallback(
    (next: number) => {
      const clamped = clampWidth(next);
      applyWidth(clamped);
      persistWidth(clamped);
    },
    [applyWidth],
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // The container width is stable for the duration of a drag, so measure the
    // calendar's minimum-width headroom once here instead of on every move.
    const container = e.currentTarget.parentElement;
    const dynamicMax = container
      ? container.clientWidth - CALENDAR_MIN_WIDTH - e.currentTarget.offsetWidth
      : TASK_LIST_MAX_WIDTH;
    dragRef.current = {
      startX: e.clientX,
      startWidth: widthRef.current,
      dynamicMax,
    };
    setIsResizing(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      const next = drag.startWidth + (e.clientX - drag.startX);
      applyWidth(clampDragWidth(next, drag.dynamicMax));
    },
    [applyWidth],
  );

  const endResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsResizing(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    persistWidth(widthRef.current);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const direction =
        e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const next =
        direction !== 0
          ? widthRef.current + direction * KEYBOARD_STEP
          : KEYBOARD_WIDTHS[e.key as keyof typeof KEYBOARD_WIDTHS];
      if (next === undefined) return;
      e.preventDefault();
      commitWidth(next);
    },
    [commitWidth],
  );

  const onDoubleClick = useCallback(() => {
    commitWidth(TASK_LIST_DEFAULT_WIDTH);
  }, [commitWidth]);

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
