import { useEffect, useState } from "react";
import { cursor$ } from "@web/common/context/pointer-position";

export function useCursorCoordinates() {
  const cursor = cursor$.getValue();
  const [x, setX] = useState<number>(cursor.x);
  const [y, setY] = useState<number>(cursor.y);

  useEffect(() => {
    const subscription = cursor$.subscribe((value) => {
      setX(value.x);
      setY(value.y);
    });

    return () => subscription.unsubscribe();
  }, [setX, setY]);

  return { x, y };
}
