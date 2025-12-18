import { Resizable as ReResizable, ResizableProps } from "re-resizable";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  cloneElement,
  isValidElement,
} from "react";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

export function Resizable({
  children,
  dndProps,
  ...props
}: PropsWithChildren<
  ResizableProps & {
    dndProps?: {
      listeners?: SyntheticListenerMap;
      setDisabled: Dispatch<SetStateAction<boolean>>;
      isDragging: boolean;
    };
  }
>) {
  const isValidChildren = isValidElement(children);

  if (!isValidChildren) return null;

  return (
    <ReResizable {...props}>
      {cloneElement(children, {
        ...children.props,
        ...(dndProps ? { dndProps } : {}),
      })}
    </ReResizable>
  );
}
