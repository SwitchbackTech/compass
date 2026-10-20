import classNames from "classnames";
import { type ReactNode } from "react";

export function ShortcutHint({
  children,
  title,
  className = "",
  variant = "keycap",
  visible = true,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
  variant?: "keycap" | "plain";
  /** When false, keeps layout space but hides the chip (shortcuts stand down). */
  visible?: boolean;
}) {
  return (
    <span
      title={title}
      className={classNames(
        variant === "keycap"
          ? "c-keycap"
          : "inline-flex items-center text-text-muted text-xs",
        !visible && "invisible",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
