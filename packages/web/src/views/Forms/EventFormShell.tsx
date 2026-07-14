import classNames from "classnames";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { type CSSVariables } from "@web/common/styles/css.types";
import { EVENT_HOVER_COLOR } from "@web/common/styles/theme.util";

interface EventFormShellProps extends ComponentPropsWithoutRef<"form"> {
  children: ReactNode;
}

/**
 * Outer `<form>` for the event form. It owns the panel's layout — padding,
 * background, shadow, rounding, transition, and the `--event-form-bg`. The
 * form renders docked inside the sidebar, so it fills its container and the
 * (resizable) sidebar width is the single source of the form's size.
 * Content-agnostic: callers pass their fields as children and any
 * form-specific props (`name`, mouse handlers, an extra `className`).
 */
export const EventFormShell = ({
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
        "--event-form-bg": EVENT_HOVER_COLOR,
      } as CSSVariables
    }
  >
    {children}
  </form>
);
