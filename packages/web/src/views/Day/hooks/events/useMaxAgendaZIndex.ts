import { useEffect, useState } from "react";
import { maxAgendaZIndex$ } from "@web/views/Day/util/agenda/agenda.util";

// Hook to get the current maximum z-index of agenda events
// **important** initialize only once within DraftProviderV2
export function useMaxAgendaZIndex() {
  const [maxZIndex, setMaxZIndex] = useState(maxAgendaZIndex$.getValue());

  useEffect(() => {
    const subscription = maxAgendaZIndex$.subscribe((index) => {
      setMaxZIndex(index);
    });

    return () => subscription.unsubscribe();
  }, []);

  return maxZIndex;
}
