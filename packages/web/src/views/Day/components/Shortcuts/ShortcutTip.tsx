import { type ReactNode, useState } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

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
}) => <ShortcutKeys combo={displayShortcut} title={ariaLabel} />;

export const ShortcutTip = ({
  shortcut,
  "aria-label": ariaLabel,
  children,
}: ShortcutProps) => {
  const displayShortcut = Array.isArray(shortcut)
    ? shortcut.join("+")
    : shortcut;
  const [isHovered, setIsHovered] = useState(false);

  if (children != null) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: Hover only reveals the visible shortcut hint for nearby controls.
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
