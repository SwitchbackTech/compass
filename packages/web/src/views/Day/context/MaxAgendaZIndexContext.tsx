import { createContext, useEffect, useState } from "react";
import { BehaviorSubject, debounceTime, distinctUntilChanged } from "rxjs";

export const maxAgendaZIndex$ = new BehaviorSubject<number>(0);

export const MaxAgendaEventZIndexContext = createContext<number>(0);

export function MaxAgendaEventZIndexProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [maxZIndex, setMaxZIndex] = useState(maxAgendaZIndex$.getValue());

  useEffect(() => {
    const subscription = maxAgendaZIndex$
      .pipe(distinctUntilChanged(), debounceTime(100))
      .subscribe(setMaxZIndex);

    return () => subscription.unsubscribe();
  }, []);

  return (
    <MaxAgendaEventZIndexContext.Provider value={maxZIndex}>
      {children}
    </MaxAgendaEventZIndexContext.Provider>
  );
}
