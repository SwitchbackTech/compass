import {
  ShortcutProps,
  useShortcuts,
} from "@web/views/Calendar/hooks/shortcuts/useShortcuts";

export function Shortcuts({
  children,
  shortcutsProps,
}: {
  children: React.ReactNode;
  shortcutsProps: ShortcutProps;
}) {
  useShortcuts(shortcutsProps);

  return children;
}
