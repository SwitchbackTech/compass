import {
  useLayoutEffect,
  useRef,
  RefCallback,
  RefObject,
  useState,
  useCallback,
} from "react";

export const useClientRect = () => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const ref = useCallback((node: HTMLElement) => {
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);
  return [rect, ref];
};

const useCustom = (): [
  RefObject<HTMLDivElement>,
  (node: HTMLDivElement) => void
] => {
  const mainGridRef = useRef<HTMLDivElement | null>(null);

  const setMainGridRef: RefCallback<HTMLDivElement> = useCallback((node) => {
    mainGridRef.current = node;
  }, []);

  return [mainGridRef, setMainGridRef];
};
