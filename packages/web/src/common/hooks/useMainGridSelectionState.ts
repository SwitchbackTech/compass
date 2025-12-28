import { useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";

export const selecting$ = new BehaviorSubject<boolean>(false);

export function useMainGridSelectionState() {
  const [selecting, setSelecting] = useState<boolean>(false);

  useEffect(() => {
    const subscription = selecting$.subscribe((isSelecting) => {
      if (isSelecting) {
        setSelecting(true);
      } else {
        // Add a 1ms delay unsetting selecting to allow for onClick handler
        // pointerup event discrimination during selection
        setTimeout(() => setSelecting(false), 1);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { selecting };
}
