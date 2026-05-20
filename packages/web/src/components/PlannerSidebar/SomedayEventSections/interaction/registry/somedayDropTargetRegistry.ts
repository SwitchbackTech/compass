import { type MutableRefObject, type Ref, useCallback, useRef } from "react";
import { type SomedayInteractionCategory } from "./somedayEventRegistry";

export const SOMEDAY_INTERACTION_DROP_CATEGORY_ATTRIBUTE =
  "data-someday-interaction-drop-category";

export interface SomedayInteractionDropTarget {
  category: SomedayInteractionCategory;
  element: HTMLElement;
}

export interface SomedayDropTargetRegistry {
  clear(): void;
  getTargets(): SomedayInteractionDropTarget[];
  register(registration: SomedayInteractionDropTarget): () => void;
}

const createSomedayDropTargetRegistry = (): SomedayDropTargetRegistry => {
  const targets = new Map<
    SomedayInteractionCategory,
    SomedayInteractionDropTarget
  >();

  const register = (registration: SomedayInteractionDropTarget) => {
    registration.element.setAttribute(
      SOMEDAY_INTERACTION_DROP_CATEGORY_ATTRIBUTE,
      registration.category,
    );
    targets.set(registration.category, registration);

    return () => {
      const current = targets.get(registration.category);

      if (current?.element === registration.element) {
        targets.delete(registration.category);
      }
    };
  };

  const getTargets = () =>
    Array.from(targets.values()).filter(
      (target) =>
        target.element.isConnected &&
        target.element.getAttribute(
          SOMEDAY_INTERACTION_DROP_CATEGORY_ATTRIBUTE,
        ) === target.category,
    );

  const clear = () => {
    targets.clear();
  };

  return {
    clear,
    getTargets,
    register,
  };
};

export const somedayDropTargetRegistry = createSomedayDropTargetRegistry();

export const useSomedayDropTargetRegistrationRef = ({
  category,
  forwardedRef,
  registry = somedayDropTargetRegistry,
}: {
  category: SomedayInteractionCategory;
  forwardedRef?: Ref<HTMLDivElement>;
  registry?: SomedayDropTargetRegistry;
}) => {
  const unregisterRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      unregisterRef.current?.();
      unregisterRef.current = null;
      assignRef(forwardedRef, node);

      if (!node) {
        return;
      }

      unregisterRef.current = registry.register({
        category,
        element: node,
      });
    },
    [category, forwardedRef, registry],
  );
};

const assignRef = (
  ref: Ref<HTMLDivElement> | undefined,
  node: HTMLDivElement | null,
) => {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(node);
    return;
  }

  (ref as MutableRefObject<HTMLDivElement | null>).current = node;
};
