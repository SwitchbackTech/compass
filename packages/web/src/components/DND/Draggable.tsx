import { ObjectId } from "bson";
import {
  DetailedHTMLProps,
  ForwardedRef,
  HTMLAttributes,
  ReactHTML,
  createElement,
  forwardRef,
  useCallback,
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

export interface DraggableDNDData {
  type: Categories_Event;
  event: Schema_GridEvent | null;
  view: "day" | "week" | "now";
}

function CompassDraggable(
  props: DetailedHTMLProps<
    {
      dndProps: Omit<UseDraggableArguments, "id" | "data"> & {
        id?: UniqueIdentifier;
        data: DraggableDNDData;
      };
      as: keyof ReactHTML;
    } & HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
  ref: ForwardedRef<HTMLElement | null>,
) {
  const { dndProps, as, style, onContextMenu, ...elementProps } = props;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      ...props.dndProps,
      id: props.dndProps.id ?? new ObjectId().toString(),
    });

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      setNodeRef(element);

      if (!ref) return;

      if (typeof ref === "function") {
        ref(element);
      } else if (typeof ref !== "string") {
        ref.current = element;
      }
    },
    [ref, setNodeRef],
  );

  const dndStyle = useMemo(() => {
    if (!transform) return {};

    return { transform: CSS.Translate.toString(transform) };
  }, [transform]);

  return createElement(as ?? "div", {
    ...elementProps,
    ...listeners,
    ...attributes,
    onContextMenu: isDragging ? undefined : onContextMenu,
    style: {
      ...style,
      ...dndStyle,
      ...(isDragging ? { opacity: 0 } : {}),
    },
    ref: setRef,
  });
}

export const Draggable = forwardRef(CompassDraggable);
