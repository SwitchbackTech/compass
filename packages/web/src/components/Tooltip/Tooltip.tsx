import React from "react";
import {
  cloneElement,
  forwardRef,
  HTMLProps,
  isValidElement,
  ReactNode,
} from "react";
import { useMergeRefs, FloatingPortal } from "@floating-ui/react";
import { ZIndex } from "@web/common/constants/web.constants";

import { TooltipOptions } from "./types";
import { TooltipContext, useTooltip, useTooltipContext } from "./useTooltip";
import { StyledShortcutTip } from "./styled";

export function Tooltip({
  children,
  ...options
}: { children: ReactNode } & TooltipOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.

  const tooltip = useTooltip(options);
  return (
    <TooltipContext.Provider value={tooltip}>
      {children}
    </TooltipContext.Provider>
  );
}

export const TooltipTrigger = forwardRef<
  HTMLElement,
  HTMLProps<HTMLElement> & { asChild?: boolean }
>(function TooltipTrigger({ children, asChild = false, ...props }, propRef) {
  const context = useTooltipContext();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const childrenRef = (children as any).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    return cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...children.props,
        "data-state": context.open ? "open" : "closed",
      })
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

export const TooltipContent = forwardRef<
  HTMLDivElement,
  HTMLProps<HTMLDivElement>
>(function TooltipContent(props, propRef) {
  const context = useTooltipContext();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);

  return (
    <FloatingPortal>
      {context.open && (
        <StyledShortcutTip
          ref={ref}
          style={{
            left: context.x ?? 0,
            position: context.strategy,
            top: context.y ?? 0,
            visibility: context.x == null ? "hidden" : "visible",
            zIndex: ZIndex.LAYER_1,
            ...props.style,
          }}
          {...context.getFloatingProps(props)}
        />
      )}
    </FloatingPortal>
  );
});
