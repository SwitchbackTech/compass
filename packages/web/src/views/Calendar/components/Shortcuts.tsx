import {
  ShortcutProps,
  useShortcuts,
} from "@web/views/Calendar/hooks/shortcuts/useShortcuts";
import { useWeekShortcuts } from "@web/views/Week/useWeekShortcuts";

export function Shortcuts({
  children,
  shortcutsProps,
}: {
  children: React.ReactNode;
  shortcutsProps: ShortcutProps;
}) {
  useShortcuts(shortcutsProps);
  useWeekShortcuts();

  return children;
}
