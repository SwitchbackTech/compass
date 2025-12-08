import { Dispatch, useCallback, useEffect } from "react";
import { Schema_Event } from "@core/types/event.types";
import { useMousePosition } from "@web/common/hooks/useMousePosition";

export function useCloseEventForm({
  setDraft,
}: {
  setDraft: Dispatch<React.SetStateAction<Schema_Event | null>>;
}) {
  const mousePosition = useMousePosition();
  const { setOpenAtMousePosition, openChange$ } = mousePosition;

  const closeEventForm = useCallback(() => {
    setOpenAtMousePosition(false);
  }, [setOpenAtMousePosition]);

  useEffect(() => {
    const subscription = openChange$.subscribe(([open]) => {
      if (!open) setDraft(null);
    });

    return () => subscription.unsubscribe();
  }, [openChange$, setDraft]);

  return closeEventForm;
}
