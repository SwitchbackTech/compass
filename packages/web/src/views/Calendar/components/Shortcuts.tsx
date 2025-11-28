import {
  ShortcutProps,
  useWeekShortcuts,
} from "@web/views/Calendar/hooks/shortcuts/useWeekShortcuts";

export function Shortcuts({
  children,
  shortcutsProps,
}: {
  children: React.ReactNode;
  shortcutsProps: ShortcutProps;
}) {
  useWeekShortcuts(shortcutsProps);

  return children;
}
