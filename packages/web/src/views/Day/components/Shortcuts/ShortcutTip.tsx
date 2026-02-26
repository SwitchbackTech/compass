import { ReactNode, useState } from "react";

interface ShortcutProps {
  shortcut: string | string[];
  "aria-label"?: string;
  children?: ReactNode;
}

const ShortcutBadge = ({
  displayShortcut,
  ariaLabel,
}: {
  displayShortcut: string;
  ariaLabel?: string;
}) => (
  <span
    className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-gray-300"
    aria-label={ariaLabel}
  >
    {displayShortcut}
  </span>
);

export const ShortcutTip = ({
  shortcut,
  "aria-label": ariaLabel,
  children,
}: ShortcutProps) => {
  const displayShortcut = Array.isArray(shortcut)
    ? shortcut.join(" + ")
    : shortcut;
  const [isHovered, setIsHovered] = useState(false);

  if (children != null) {
    return (
      <span
        className="inline-flex items-center gap-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
        {isHovered && (
          <ShortcutBadge
            displayShortcut={displayShortcut}
            ariaLabel={ariaLabel}
          />
        )}
      </span>
    );
  }

  return (
    <ShortcutBadge displayShortcut={displayShortcut} ariaLabel={ariaLabel} />
  );
};
