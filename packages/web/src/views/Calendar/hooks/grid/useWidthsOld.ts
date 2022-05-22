import { useState, useEffect, useCallback, useLayoutEffect } from "react";

// ++ remove if not used

function useWidths(elementRef: React.MutableRefObject<HTMLDivElement>) {
  const [widths, setWidths] = useState<null | number[]>(null);

  const updateWidths = useCallback(() => {
    if (elementRef && elementRef?.current) {
      const _widths = Array.from(elementRef.current?.children || []).map(
        (e) => e.clientWidth
      );

      //   const _widths = elementRef.current.clientWidth || 0;
      console.log("widths of ref:", _widths);
      setWidths(_widths);
    } else {
      console.log("no ref yet");
    }
  }, [elementRef]);

  // useLayoutEffect(() => {
  useEffect(() => {
    updateWidths();
    window.addEventListener("resize", updateWidths);
    return () => {
      window.removeEventListener("resize", updateWidths);
    };
    // }, [updateWidths]);
  }, [elementRef, updateWidths]);

  return widths;
}

export default useWidths;
