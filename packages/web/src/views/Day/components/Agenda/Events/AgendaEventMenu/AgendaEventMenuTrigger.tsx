import React, { forwardRef } from "react";
import { useMergeRefs } from "@floating-ui/react";
import { useAgendaEventMenu } from "./context/useAgendaEventMenu";

export const AgendaEventMenuTrigger = forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & { asChild?: boolean }
>(function AgendaEventMenuTrigger(
  { children, asChild = false, ...props },
  propRef,
) {
  const context = useAgendaEventMenu();

  const childrenRef = (
    children as React.ReactElement & { ref?: React.Ref<HTMLElement> }
  ).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...children.props,
        "data-state": context.open ? "open" : "closed",
      }),
    );
  }

  return (
    <div
      ref={ref}
      role="button"
      data-state={context.open ? "open" : "closed"}
      {...context.getReferenceProps(props)}
    >
      {children}
    </div>
  );
});
