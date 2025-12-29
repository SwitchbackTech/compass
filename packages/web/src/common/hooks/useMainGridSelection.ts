import { ObjectId } from "bson";
import { useEffect } from "react";
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  skip,
} from "rxjs";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { cursor$, pointerState$ } from "@web/common/context/pointer-position";
import { isDraggingEvent$ } from "@web/common/hooks/useIsDraggingEvent";
import { selectionId$ } from "@web/common/hooks/useMainGridSelectionId";
import { selecting$ } from "@web/common/hooks/useMainGridSelectionState";
import { resizing$ } from "@web/common/hooks/useResizing";
import {
  DomMovement,
  getElementAtPoint,
  selectionStart$,
} from "@web/common/utils/dom/event-emitter.util";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";

const selection$ = combineLatest([
  pointerState$,
  cursor$,
  isDraggingEvent$,
  resizing$,
]).pipe(
  map(([pointerState, { x, y }, isDragging, isResizing]) => {
    const { event, pointerdown, isOverMainGrid, selectionStart } = pointerState;
    const pointerY = selectionStart?.clientY;
    const pointerX = selectionStart?.clientX;
    const element = selectionStart ? getElementAtPoint(selectionStart) : null;
    const id = element?.getAttribute("id");
    const pointerIsOnMainGrid = id === ID_GRID_MAIN || id === null;
    const movedX = !!pointerX && Math.abs(pointerX - x) > SLOT_HEIGHT / 2;
    const movedY = !!pointerY && Math.abs(pointerY - y) > SLOT_HEIGHT / 2;
    const selecting = selecting$.getValue();
    const moved = selecting ? true : movedY || movedX;
    const onMainGrid = selecting ? true : isOverMainGrid && pointerIsOnMainGrid;

    const isSelecting =
      pointerdown &&
      onMainGrid &&
      pointerY !== undefined &&
      pointerX !== undefined &&
      event.button === -1 && // pointermove event has button === -1 when no button is pressed
      moved &&
      !isDragging &&
      !isResizing;

    return {
      isSelecting,
      start: selectionStart,
      delta: { clientX: x, clientY: y },
    };
  }),
  shareReplay(1),
);

const selectionToggle$ = selection$.pipe(
  distinctUntilChanged((prev, curr) => prev.isSelecting === curr.isSelecting),
  skip(1),
);

const change$ = selection$.pipe(filter(({ isSelecting }) => isSelecting));

const internalSelectionStart$ = new BehaviorSubject<
  DomMovement["selectionStart"]
>(null);

export function useMainGridSelection({
  onSelectionStart,
  onSelectionEnd,
  onSelection,
}: {
  onSelectionStart?: (
    id: string,
    start: DomMovement["selectionStart"],
    delta: DomMovement["selectionStart"],
  ) => void;
  onSelectionEnd?: (
    id: string,
    start: DomMovement["selectionStart"],
    delta: DomMovement["selectionStart"],
  ) => void;
  onSelection?: (
    id: string,
    start: DomMovement["selectionStart"],
    delta: DomMovement["selectionStart"],
  ) => void;
} = {}) {
  useEffect(() => {
    const toggleSubscription = selectionToggle$.subscribe(
      ({ isSelecting, delta, start }) => {
        selecting$.next(isSelecting);

        const hasToggleHandlers = onSelectionStart || onSelectionEnd;

        if (!hasToggleHandlers) return;

        if (isSelecting) {
          const id = new ObjectId().toString();
          selectionId$.next(id);
          internalSelectionStart$.next(start);
          onSelectionStart?.(id, start, delta);
        } else {
          onSelectionEnd?.(
            selectionId$.getValue()!,
            internalSelectionStart$.getValue()!,
            delta,
          );

          selectionId$.next(null);
          selectionStart$.next(null);
        }
      },
    );

    const changeSubscription = onSelection
      ? change$.subscribe(({ delta, start }) => {
          onSelection?.(selectionId$.getValue()!, start, delta);
        })
      : null;

    return () => {
      toggleSubscription?.unsubscribe();
      changeSubscription?.unsubscribe();
    };
  }, [onSelectionStart, onSelectionEnd, onSelection]);
}
