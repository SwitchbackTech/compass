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

export interface DNDChildProps
  extends Pick<
    ReturnType<typeof useDraggable>,
    "over" | "listeners" | "isDragging"
  > {
  id: UniqueIdentifier;
  setDisabled?: (disabled: boolean) => void;
}

function CompassDraggable(
  props: DetailedHTMLProps<
    {
      dndProps: Omit<UseDraggableArguments, "id" | "data"> & {
        id: UniqueIdentifier;
        data: DraggableDNDData;
      };
      as: keyof ReactHTML;
      asChild?: boolean;
    } & HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
  _ref: ForwardedRef<HTMLElement | null>,
) {
  const { as, asChild, style, onContextMenu, children, ...elementProps } =
    props;

  const { setNodeRef, attributes, listeners, transform, isDragging, over } =
    useDraggable({
      ...props.dndProps,
      id: props.dndProps.id ?? new ObjectId().toString(),
      disabled: props.dndProps.disabled ?? false,
    });

  const ref = useMergeRefs([_ref, setNodeRef]);
  const useChild = asChild && isValidElement(children);

  const elementPropsWithAttributes = {
    ...attributes,
    ...elementProps,
    ...(!useChild ? listeners : {}),
    onContextMenu: isDragging ? undefined : onContextMenu,
    style: {
      ...style,
      ...(isDragging
        ? { opacity: 0, transform: CSS.Translate.toString(transform) }
        : {}),
    },
    ref,
  };

  if (useChild) {
    return createElement(
      as ?? "div",
      elementPropsWithAttributes,
      cloneElement(children, {
        ...children.props,
        dndProps: {
          over,
          id: props.dndProps.id,
          listeners,
          isDragging,
          setDisabled: undefined,
        },
      }),
    );
  }

  return createElement(as ?? "div", elementPropsWithAttributes, children);
}

export const Draggable = forwardRef(CompassDraggable);
