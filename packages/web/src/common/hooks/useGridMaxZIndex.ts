import { useEffect, useState } from "react";
import { distinctUntilChanged, share } from "rxjs/operators";
import { maxGridZIndex$ } from "@web/common/utils/dom/grid-organization.util";

const maxZIndex$ = maxGridZIndex$.pipe(distinctUntilChanged(), share());

export function useGridMaxZIndex() {
  const [maxZIndex, setMaxZIndex] = useState(maxGridZIndex$.getValue());

  useEffect(() => {
    const subscription = maxZIndex$.subscribe(setMaxZIndex);

    return () => subscription.unsubscribe();
  }, []);

  return maxZIndex;
}
