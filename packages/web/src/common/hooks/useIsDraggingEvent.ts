import { useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";

export const isDraggingEvent$ = new BehaviorSubject<boolean>(false);

export function useIsDraggingEvent() {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const subscription = isDraggingEvent$.subscribe(setIsDragging);

    return () => subscription.unsubscribe();
  }, []);

  return isDragging;
}
