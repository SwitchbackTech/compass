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
import { useMergeRefs } from "@floating-ui/react";

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
  _ref: ForwardedRef<HTMLElement | null>,
) {
  const { dndProps, as, ...elementProps } = props;

  const { setNodeRef } = useDroppable({
    ...props.dndProps,
    id: props.dndProps.id ?? new ObjectId().toString(),
  });

  const ref = useMergeRefs([_ref, setNodeRef]);

  return createElement(as ?? "div", { ...elementProps, ref });
}

export const Droppable = forwardRef(CompassDroppable);
