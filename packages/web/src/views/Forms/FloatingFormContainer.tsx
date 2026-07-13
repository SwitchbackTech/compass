import { forwardRef, type HTMLAttributes } from "react";
import { Z_INDEX_FLOATING_FORM } from "@web/common/constants/web.constants";

interface FloatingFormContainerProps extends HTMLAttributes<HTMLDivElement> {
  strategy: "fixed" | "absolute";
  left: number;
  top: number;
}

export const FloatingFormContainer = forwardRef<
  HTMLDivElement,
  FloatingFormContainerProps
>(({ strategy, left, top, style, ...props }, ref) => (
  <div
    {...props}
    className="w-max"
    ref={ref}
    style={{
      ...style,
      left,
      position: strategy || "absolute",
      top,
      zIndex: Z_INDEX_FLOATING_FORM,
    }}
  />
));

FloatingFormContainer.displayName = "FloatingFormContainer";
