import { useEffect } from "react";
import { UseFloatingOptions } from "@floating-ui/react";
import {
  OpenAtCursorContext,
  openedAtCursorChange$,
} from "@web/common/context/open-at-cursor";
import { useMetaContext } from "@web/common/hooks/useMetaContext";

export function useOpenAtCursor({
  onOpenChange,
}: Pick<UseFloatingOptions, "onOpenChange"> = {}) {
  const context = useMetaContext(OpenAtCursorContext, "useOpenAtCursor");

  useEffect(() => {
    if (onOpenChange) {
      const subscription = openedAtCursorChange$.subscribe((args) =>
        onOpenChange(...args),
      );

      return () => subscription.unsubscribe();
    }
  }, [onOpenChange]);

  return context;
}
