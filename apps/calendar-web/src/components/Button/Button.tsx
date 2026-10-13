import classNames from "classnames";
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type PropsWithChildren,
} from "react";

// A native button (not a div) so Enter/Space activate it — click handlers
// often live on a wrapping TooltipTrigger div and rely on bubbling.
export const Btn = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>
>(({ className, type = "button", ...props }, ref) => (
  <button
    {...props}
    type={type}
    className={classNames(
      "c-focus-ring flex cursor-pointer items-center rounded-xs",
      className,
    )}
    ref={ref}
  />
));

Btn.displayName = "Btn";
