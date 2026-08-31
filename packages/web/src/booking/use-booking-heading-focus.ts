import { useEffect, useRef } from "react";

/** Focus the booking status heading when `viewKey` changes. */
export function useBookingHeadingFocus(viewKey: unknown) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: viewKey is the focus key
  useEffect(() => {
    headingRef.current?.focus();
  }, [viewKey]);

  return headingRef;
}
