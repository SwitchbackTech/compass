import { PropsWithChildren, createContext, useRef } from "react";

interface CompassRefs {
  nowLineRef: React.MutableRefObject<HTMLDivElement | null>;
  timedEventsContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  timedEventsGridRef: React.MutableRefObject<HTMLDivElement | null>;
  allDayEventsGridRef: React.MutableRefObject<HTMLDivElement | null>;
}

export const CompassRefsContext = createContext<CompassRefs | null>(null);

export function CompassRefsProvider({ children }: PropsWithChildren) {
  const nowLineRef = useRef<HTMLDivElement | null>(null);
  const timedEventsContainerRef = useRef<HTMLDivElement | null>(null);
  const timedEventsGridRef = useRef<HTMLDivElement | null>(null);
  const allDayEventsGridRef = useRef<HTMLDivElement | null>(null);

  return (
    <CompassRefsContext.Provider
      value={{
        timedEventsContainerRef,
        nowLineRef,
        timedEventsGridRef,
        allDayEventsGridRef,
      }}
    >
      {children}
    </CompassRefsContext.Provider>
  );
}
