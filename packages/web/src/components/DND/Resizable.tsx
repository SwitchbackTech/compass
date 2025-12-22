import { Resizable as ReResizable, ResizableProps } from "re-resizable";
import { PropsWithChildren, cloneElement, isValidElement } from "react";
import { DNDChildProps } from "@web/components/DND/Draggable";

export function Resizable({
  children,
  dndProps,
  ...props
}: PropsWithChildren<ResizableProps & { dndProps?: DNDChildProps }>) {
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
