import {
  type ShortcutProps,
  useWeekShortcutOwner,
} from "@web/views/Week/hooks/shortcuts/useWeekShortcutOwner";

export function Shortcuts({
  children,
  shortcutsProps,
}: {
  children: React.ReactNode;
  shortcutsProps: ShortcutProps;
}) {
  useWeekShortcutOwner(shortcutsProps);

  return children;
}
