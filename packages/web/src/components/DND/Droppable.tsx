import { ObjectId } from "bson";
import {
  DetailedHTMLProps,
  ForwardedRef,
  HTMLAttributes,
  ReactHTML,
  createElement,
  forwardRef,
  useCallback,
} from "react";
import {
  UniqueIdentifier,
  UseDroppableArguments,
  useDroppable,
} from "@dnd-kit/core";

function CompassDroppable(
  props: DetailedHTMLProps<
    {
      dndProps: Omit<UseDroppableArguments, "id" | "data"> & {
        id?: UniqueIdentifier;
      };
      as: keyof ReactHTML;
    } & HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
  ref: ForwardedRef<HTMLElement | null>,
) {
  const { dndProps, as, ...elementProps } = props;

  const { setNodeRef, active } = useDroppable({
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

  return createElement(as ?? "div", {
    ...elementProps,
    style: { ...props.style, ...(active?.id ? { overflowY: "hidden" } : {}) },
    ref: setRef,
  });
}

export const Droppable = forwardRef(CompassDroppable);
