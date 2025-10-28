import { ReactNode } from "react";

interface ShortcutProps {
  shortcut: string | string[];
  "aria-label"?: string;
}

export const Shortcut = ({
  shortcut,
  "aria-label": ariaLabel,
}: ShortcutProps) => {
  const displayShortcut = Array.isArray(shortcut)
    ? shortcut.join(" + ")
    : shortcut;

  return (
    <span
      className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-gray-300"
      aria-label={ariaLabel}
    >
      {displayShortcut}
    </span>
  );
};

interface ShortcutTipProps {
  shortcut: string | string[];
  children?: ReactNode;
  "aria-label"?: string;
}

export const ShortcutTip = ({
  shortcut,
  children,
  "aria-label": ariaLabel,
}: ShortcutTipProps) => {
  if (children) {
    return (
      <div className="flex items-center gap-2">
        {children}
        <Shortcut shortcut={shortcut} aria-label={ariaLabel} />
      </div>
    );
  }

  return <Shortcut shortcut={shortcut} aria-label={ariaLabel} />;
};
