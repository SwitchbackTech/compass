import { type UniqueIdentifier } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";

export const resizeId$ = new BehaviorSubject<UniqueIdentifier | null>(null);

export function useResizeId() {
  const [id, setId] = useState<UniqueIdentifier | null>(resizeId$.getValue());

  useEffect(() => {
    const subscription = resizeId$.subscribe(setId);
    return () => subscription.unsubscribe();
  }, []);

  return id;
}
