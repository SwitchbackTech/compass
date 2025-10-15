import React from "react";

export const ShortcutTip = ({ shortcut }: { shortcut: string }) => {
  return (
    <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-gray-300">
      {shortcut}
    </span>
  );
};
