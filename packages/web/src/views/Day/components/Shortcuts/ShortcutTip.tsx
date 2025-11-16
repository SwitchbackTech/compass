import { ReactNode, useState } from "react";

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
  const [isHovered, setIsHovered] = useState(false);

  if (children) {
    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {children}
        </div>
        {isHovered && (
          <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform">
            <div className="rounded border border-gray-600 bg-gray-800 px-2 py-1 shadow-lg">
              <Shortcut shortcut={shortcut} aria-label={ariaLabel} />
            </div>
            <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-600"></div>
          </div>
        )}
      </div>
    );
  }

  return <Shortcut shortcut={shortcut} aria-label={ariaLabel} />;
};
