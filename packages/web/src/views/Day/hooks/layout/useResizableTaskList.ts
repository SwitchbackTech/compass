import type React from "react";
import { useCallback, useRef, useState } from "react";
import {
  clampTaskListWidth,
  TASK_LIST_DEFAULT_WIDTH,
  TASK_LIST_MAX_WIDTH,
  TASK_LIST_MIN_WIDTH,
} from "@web/views/Day/storage/task-list-width.constants";
import {
  readTaskListWidth,
  writeTaskListWidth,
} from "@web/views/Day/storage/task-list-width.storage";

// Matches the calendar grid's min-w-xs so a drag can never squeeze it below
// its own minimum.
const CALENDAR_MIN_WIDTH = 320;
const KEYBOARD_STEP = 16;

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

export function useResizableTaskList() {
  const [width, setWidth] = useState(readTaskListWidth);
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
      const clamped = clampTaskListWidth(next);
      applyWidth(clamped);
      writeTaskListWidth(clamped);
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
    writeTaskListWidth(widthRef.current);
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
