import { useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";

export const selectionId$ = new BehaviorSubject<string | null>(null);

export function useMainGridSelectionId() {
  const [id, setId] = useState<string | null>(selectionId$.getValue());

  useEffect(() => {
    const subscription = selectionId$.subscribe(setId);

    return () => subscription.unsubscribe();
  }, []);

  return id;
}
