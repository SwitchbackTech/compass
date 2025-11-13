import { Dispatch, useEffect, useRef, useState } from "react";
import { Dayjs } from "@core/util/date/dayjs";

/**
 * Hook that synchronizes state with an initial date prop, but only updates
 * when the actual date value changes, not just the object reference.
 *
 * This prevents unnecessary state updates when the same date is passed as
 * a new object instance (e.g., when a component re-renders).
 *
 * @param initialDate - The initial date to sync with
 * @returns A tuple of [dateInView, setDateInView] similar to useState
 */
export function useSyncDate(
  initialDate: Dayjs,
): [Dayjs, Dispatch<React.SetStateAction<Dayjs>>] {
  const [dateInView, setDateInView] = useState(initialDate);
  const prevInitialDateRef = useRef<string>(initialDate.format("YYYY-MM-DD"));

  // Sync state when initialDate prop changes (e.g., when route changes)
  // Only update if the actual date value changed, not just the object reference
  useEffect(() => {
    const currentInitialDateStr = initialDate.format("YYYY-MM-DD");
    if (prevInitialDateRef.current !== currentInitialDateStr) {
      prevInitialDateRef.current = currentInitialDateStr;
      setDateInView(initialDate);
    }
  }, [initialDate]);

  return [dateInView, setDateInView];
}
