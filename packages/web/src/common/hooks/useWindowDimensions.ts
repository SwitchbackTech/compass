import { useLayoutEffect, useState } from "react";

interface Dimensions {
  height: number;
  width: number;
}

// ++ remove if not used
export const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState<Dimensions>({
    height: 0,
    width: 0,
  });

  const handleResize = () => {
    setDimensions({ height: window.innerHeight, width: window.innerWidth });
    console.log(`${dimensions.height}, ${dimensions.width} ++`);
  };

  useLayoutEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [dimensions]);

  return dimensions;
};
