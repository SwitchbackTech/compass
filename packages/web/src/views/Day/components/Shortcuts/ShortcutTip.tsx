import { type ReactNode, useState } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

interface ShortcutProps {
  shortcut: string | string[];
  "aria-label"?: string;
  children?: ReactNode;
}

const ShortcutBadge = ({
  shortcut,
  ariaLabel,
}: {
  shortcut: string | string[];
  ariaLabel?: string;
}) => <ShortcutKeys keys={shortcut} title={ariaLabel} />;

export const ShortcutTip = ({
  shortcut,
  "aria-label": ariaLabel,
  children,
}: ShortcutProps) => {
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
          <ShortcutBadge shortcut={shortcut} ariaLabel={ariaLabel} />
        )}
      </span>
    );
  }

  return <ShortcutBadge shortcut={shortcut} ariaLabel={ariaLabel} />;
};
