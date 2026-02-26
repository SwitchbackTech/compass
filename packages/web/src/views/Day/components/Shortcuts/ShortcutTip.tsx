interface ShortcutProps {
  shortcut: string | string[];
  "aria-label"?: string;
}

export const ShortcutTip = ({
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
