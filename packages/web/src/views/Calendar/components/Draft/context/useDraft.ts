import { useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";
import { Schema_Event } from "@core/types/event.types";

export const draft$ = new BehaviorSubject<Schema_Event | null>(null);

export const setDraft = (event: Schema_Event | null) => draft$.next(event);

export const useDraft = () => {
  const [draft, _setDraft] = useState<Schema_Event | null>(draft$.getValue());

  useEffect(() => {
    const subscription = draft$.subscribe(_setDraft);

    return () => subscription.unsubscribe();
  }, [_setDraft]);

  return draft;
};
