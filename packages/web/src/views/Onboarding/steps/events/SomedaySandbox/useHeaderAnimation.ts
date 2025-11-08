import { useEffect, useState } from "react";

export const useHeaderAnimation = () => {
  const [isHeaderAnimating, setIsHeaderAnimating] = useState(true);

  useEffect(() => {
    setIsHeaderAnimating(true);
    const timeout = setTimeout(() => setIsHeaderAnimating(false), 2500);
    return () => clearTimeout(timeout);
  }, []);

  return { isHeaderAnimating };
};
