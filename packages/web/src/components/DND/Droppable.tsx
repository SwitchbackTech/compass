import { ObjectId } from "bson";
import mergeWith from "lodash.mergewith";
import {
  DetailedHTMLProps,
  ForwardedRef,
  HTMLAttributes,
  ReactHTML,
  createElement,
  forwardRef,
  useCallback,
  useImperativeHandle,
} from "react";
import {
  UniqueIdentifier,
  UseDraggableArguments,
  useDroppable,
} from "@dnd-kit/core";

export interface DroppableDNDData {
  containerWidth?: number;
}

function CompassDroppable(
  props: DetailedHTMLProps<
    {
      dndProps: Omit<UseDraggableArguments, "id" | "data"> & {
        id?: UniqueIdentifier;
        data: DroppableDNDData;
      };
      as: keyof ReactHTML;
    } & HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
  ref: ForwardedRef<
    HTMLElement & Omit<ReturnType<typeof useDroppable>, "setNodeRef" | "node">
  >,
) {
  const { dndProps, as, ...elementProps } = props;

  const { setNodeRef, active, isOver, node, over, rect } = useDroppable({
    ...props.dndProps,
    id: props.dndProps.id ?? new ObjectId().toString(),
  });

  const dndHandles = {
    active,
    isOver,
    node,
    over,
    rect,
  };

  useImperativeHandle(
    node,
    () => (node.current ? mergeWith(node.current, dndHandles) : null),
    [dndHandles, node],
  );

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      setNodeRef(element);

      if (!ref) return;

      const handles = element !== null ? mergeWith(element, dndHandles) : null;

      if (typeof ref === "function") {
        ref(handles);
      } else if (typeof ref !== "string") {
        ref.current = handles;
      }
    },
    [ref, setNodeRef, dndHandles],
  );

  return createElement(as ?? "div", {
    ...elementProps,
    style: { ...props.style, ...(active?.id ? { overflowY: "hidden" } : {}) },
    ref: setRef,
  });
}

export const Droppable = forwardRef(CompassDroppable);
