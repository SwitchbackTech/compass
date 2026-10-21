import classNames from "classnames";
import { type ReactNode } from "react";

export function ShortcutHint({
  children,
  title,
  className = "",
  variant = "keycap",
  visible = true,
  reserveSpaceWhenHidden = true,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
  variant?: "keycap" | "plain";
  /** When false, hides the chip (shortcuts stand down). */
  visible?: boolean;
  /** When visible is false, keep layout space (invisible) vs remove it (hidden). */
  reserveSpaceWhenHidden?: boolean;
}) {
  return (
    <span
      title={title}
      className={classNames(
        variant === "keycap"
          ? "c-keycap"
          : "inline-flex items-center text-text-muted text-xs",
        !visible && (reserveSpaceWhenHidden ? "invisible" : "hidden"),
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
