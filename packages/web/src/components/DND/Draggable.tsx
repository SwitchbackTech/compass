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
  useMemo,
} from "react";
import {
  UniqueIdentifier,
  UseDraggableArguments,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Categories_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export interface DNDData {
  type: Categories_Event;
  event: Schema_GridEvent | null;
  view: "day" | "week" | "now";
  [key: string]: any;
}

function CompassDraggable(
  props: DetailedHTMLProps<
    {
      dndProps: Omit<UseDraggableArguments, "id" | "data"> & {
        id?: UniqueIdentifier;
        data: DNDData;
      };
      as: keyof ReactHTML;
    } & HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
  ref: ForwardedRef<
    HTMLElement &
      Omit<
        ReturnType<typeof useDraggable>,
        "setNodeRef" | "attributes" | "listeners" | "transform" | "node"
      >
  >,
) {
  const { dndProps, as, style, ...elementProps } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    activatorEvent,
    active,
    activeNodeRect,
    isDragging,
    node,
    over,
    setActivatorNodeRef,
  } = useDraggable({
    ...props.dndProps,
    id: props.dndProps.id ?? new ObjectId().toString(),
  });

  const dndHandles = {
    activatorEvent,
    active,
    activeNodeRect,
    isDragging,
    over,
    setActivatorNodeRef,
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

  const dndStyle = useMemo(() => {
    if (!transform) return {};

    return { transform: CSS.Translate.toString(transform) };
  }, [transform]);

  return createElement(as ?? "div", {
    ...elementProps,
    ...listeners,
    ...attributes,
    style: {
      ...style,
      ...dndStyle,
      ...(isDragging ? { opacity: 0 } : {}),
    },
    ref: setRef,
  });
}

export const Draggable = forwardRef(CompassDraggable);
