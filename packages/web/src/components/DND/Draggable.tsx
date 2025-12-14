import { ObjectId } from "bson";
import {
  DetailedHTMLProps,
  ForwardedRef,
  HTMLAttributes,
  ReactHTML,
  createElement,
  forwardRef,
  useMemo,
} from "react";
import {
  UniqueIdentifier,
  UseDraggableArguments,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMergeRefs } from "@floating-ui/react";
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
  _ref: ForwardedRef<HTMLElement | null>,
) {
  const { dndProps, as, style, onContextMenu, ...elementProps } = props;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      ...props.dndProps,
      id: props.dndProps.id ?? new ObjectId().toString(),
    });

  const ref = useMergeRefs([_ref, setNodeRef]);

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
    ref,
  });
}

export const Draggable = forwardRef(CompassDraggable);
