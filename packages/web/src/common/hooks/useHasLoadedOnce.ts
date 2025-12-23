import { useEffect, useRef } from "react";

export const useHasLoadedOnce = (
  isLoading: boolean,
  condition: boolean = true,
) => {
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (!isLoading && condition) {
      hasLoadedOnce.current = true;
    }
  }, [isLoading, condition]);

  return hasLoadedOnce;
};
