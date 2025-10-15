import React from "react";

export function ShortcutHint({
  children,
  title,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={
        "ml-1 inline-flex items-center rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500 " +
        className
      }
      aria-hidden
    >
      {children}
    </span>
  );
}
