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
import { Task } from "@web/common/types/task.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export type DraggableDataType = Categories_Event | "task";

/**
 * Data structure for draggable items in the application
 * @property type - The type of item being dragged (event category or "task")
 * @property event - The event data (required when type is a Categories_Event)
 * @property task - The task data (required when type is "task")
 * @property view - The view where the drag originated ("day" | "week" | "now")
 * @property deleteTask - Optional function to delete a task (used when converting task to event)
 */
export interface DraggableDNDData {
  type: DraggableDataType;
  event?: Schema_GridEvent | null;
  task?: Task | null;
  view: "day" | "week" | "now";
  deleteTask?: () => void;
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
    children: useChild
      ? cloneElement(children, {
          ...children.props,
          dndProps: {
            over,
            id: props.dndProps.id,
            listeners,
            isDragging,
            setDisabled,
          },
        })
      : props.children,
  });
}

export const Draggable = forwardRef(CompassDraggable);
