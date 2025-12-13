import { useEffect } from "react";
import { Subject, debounceTime } from "rxjs";
import {
  gridObserver,
  reorderGrid,
} from "@web/common/utils/dom/grid-organization.util";

export function useGridOrganization(mainGrid: HTMLElement | null) {
  useEffect(() => {
    if (!mainGrid) return;

    const resize$ = new Subject<[ResizeObserverEntry[], ResizeObserver]>();
    const resizeObserver = new ResizeObserver((...args) => resize$.next(args));
    const resizeObserver$ = resize$.pipe(debounceTime(100));

    gridObserver.observe(mainGrid, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: false,
    });

    resizeObserver.observe(mainGrid);

    const resizeSubscription = resizeObserver$.subscribe(() =>
      reorderGrid(mainGrid),
    );

    return () => {
      gridObserver.disconnect();
      resizeObserver.unobserve(mainGrid);
      resizeSubscription.unsubscribe();
    };
  }, [mainGrid]);
}
