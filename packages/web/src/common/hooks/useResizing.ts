import { useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";

export const resizing$ = new BehaviorSubject<boolean>(false);

export function useResizing() {
  const [resizing, setResizing] = useState<boolean>(false);

  useEffect(() => {
    const subscription = resizing$.subscribe(setResizing);
    return () => subscription.unsubscribe();
  }, []);

  return resizing;
}
