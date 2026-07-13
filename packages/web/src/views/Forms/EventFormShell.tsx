import classNames from "classnames";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { type Priorities } from "@core/constants/core.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import { hoverColorByPriority } from "@web/common/styles/theme.util";

interface EventFormShellProps extends ComponentPropsWithoutRef<"form"> {
  priority: Priorities;
  children: ReactNode;
}

/**
 * Outer `<form>` for the event form. It owns the panel's layout — padding,
 * background, shadow, rounding, transition, and the priority-tinted
 * `--event-form-bg`. The form renders docked inside the sidebar, so it fills
 * its container and the (resizable) sidebar width is the single source of
 * the form's size.
 * Content-agnostic: callers pass their fields as children and any
 * form-specific props (`name`, mouse handlers, an extra `className`).
 */
export const EventFormShell = ({
  priority,
  className,
  style,
  children,
  ...props
}: EventFormShellProps) => (
  <form
    {...props}
    // biome-ignore lint/a11y/noRedundantRoles: <form> only gets its implicit "form" role when it has an accessible name, which this one doesn't; e2e tests rely on getByRole("form").
    role="form"
    className={classNames(
      "z-1 w-full rounded-sm bg-(--event-form-bg) px-5 py-4.5 shadow-[0_5px_5px_var(--color-shadow-default)] transition-all duration-300",
      className,
    )}
    style={
      {
        ...style,
        "--event-form-bg": hoverColorByPriority[priority],
      } as CSSVariables
    }
  >
    {children}
  </form>
);
