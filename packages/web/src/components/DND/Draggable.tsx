import { ObjectId } from "bson";
import {
  DetailedHTMLProps,
  ForwardedRef,
  HTMLAttributes,
  ReactHTML,
  cloneElement,
  createElement,
  forwardRef,
  isValidElement,
  useState,
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
      asChild?: boolean;
    } & HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
  _ref: ForwardedRef<HTMLElement | null>,
) {
  const [disabled, setDisabled] = useState(!!props.dndProps.disabled);

  const {
    dndProps,
    as,
    asChild,
    style,
    onContextMenu,
    children,
    ...elementProps
  } = props;

  const { setNodeRef, attributes, listeners, transform, isDragging, over } =
    useDraggable({
      ...props.dndProps,
      id: props.dndProps.id ?? new ObjectId().toString(),
      disabled,
    });

  const ref = useMergeRefs([_ref, setNodeRef]);
  const useChild = asChild && isValidElement(children);

  return createElement(as ?? "div", {
    ...elementProps,
    ...attributes,
    ...(!useChild ? listeners : {}),
    onContextMenu: isDragging ? undefined : onContextMenu,
    style: {
      ...style,
      transform: CSS.Translate.toString(transform),
      ...(isDragging ? { opacity: 0 } : {}),
    },
    ref,
    children: useChild
      ? cloneElement(children, {
          ...children.props,
          dndProps: {
            over,
            listeners,
            isDragging,
            setDisabled,
          },
        })
      : props.children,
  });
}

export const Draggable = forwardRef(CompassDraggable);
