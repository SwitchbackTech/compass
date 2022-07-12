import { useState, useEffect, useCallback } from "react";

// ++ remove if not used

function useHeight(elementRef: React.MutableRefObject<HTMLDivElement>) {
  const [height, setHeight] = useState<null | number>(null);

  const updateHeight = useCallback(() => {
    if (elementRef && elementRef?.current) {
      const _height = elementRef.current.clientHeight || 0;
      console.log("height of ref:", _height);
      // setHeight(_height / 11);
      setHeight(_height);
    }
  }, [elementRef]);

  useEffect(() => {
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, [updateHeight]);

  return height;
}

export default useHeight;
