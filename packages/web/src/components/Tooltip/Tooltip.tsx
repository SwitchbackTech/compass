import {
  HTMLProps,
  ReactNode,
  cloneElement,
  forwardRef,
  isValidElement,
} from "react";
import { FloatingPortal, useMergeRefs } from "@floating-ui/react";
import { ZIndex } from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { TooltipOptions } from "./tooltip.types";
import { TooltipContext, useTooltip, useTooltipContext } from "./useTooltip";

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
      }),
    );
  }

  return (
    <div
      ref={ref}
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
>(function TooltipContent({ children, style, ...props }, propRef) {
  const context = useTooltipContext();
  const maxZIndex = useGridMaxZIndex();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);

  return (
    <FloatingPortal>
      {context.open && (
        <div
          ref={ref}
          style={{
            left: context.x ?? 0,
            position: context.strategy,
            top: context.y ?? 0,
            visibility: context.x == null ? "hidden" : "visible",
            zIndex: maxZIndex + ZIndex.LAYER_3,
            ...style,
          }}
          {...context.getFloatingProps(props)}
        >
          {children}
        </div>
      )}
    </FloatingPortal>
  );
});
