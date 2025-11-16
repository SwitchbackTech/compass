import { HTMLProps, ReactNode } from "react";

export function ShortcutHint({
  children,
  title,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={
        "text-text-light ml-1 inline-flex items-center rounded bg-gray-700 px-1.5 py-0.5 text-xs " +
        className
      }
      aria-hidden
    >
      {children}
    </span>
  );
}

interface LegacyProps extends HTMLProps<HTMLDivElement> {
  children?: ReactNode;
}

export const LegacyShortcutHint = ({
  children,
  className = "",
  ...props
}: LegacyProps) => {
  return (
    <div
      className={`border-bg-primary bg-fg-primary flex rounded border px-2.5 py-[5px] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
