import classNames from "classnames";
import { type ReactNode } from "react";

export function ShortcutHint({
  children,
  title,
  className = "",
  variant = "keycap",
}: {
  children: ReactNode;
  title?: string;
  className?: string;
  variant?: "keycap" | "plain";
}) {
  return (
    <span
      title={title}
      className={classNames(
        "inline-flex items-center text-text-light text-xs",
        variant === "keycap" && "rounded bg-gray-700 px-1.5 py-0.5",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
