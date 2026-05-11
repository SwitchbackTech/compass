import classNames from "classnames";
import { forwardRef, type HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  isActive: boolean;
}

export const DropZone = forwardRef<HTMLDivElement, Props>(
  ({ className, isActive, ...props }, ref) => {
    return (
      <div
        {...props}
        className={classNames(
          "relative rounded-default border-2 border-dashed transition-[background-color,border-color] duration-200",
          isActive
            ? "border-border-primary bg-bg-secondary"
            : "border-transparent bg-transparent",
          className,
        )}
        ref={ref}
      />
    );
  },
);

DropZone.displayName = "DropZone";
