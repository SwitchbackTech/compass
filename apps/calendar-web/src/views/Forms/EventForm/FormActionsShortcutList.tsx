import {
  type EventFormActionListOptions,
  listEventFormActions,
} from "@core/shortcuts/event-form-actions";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

/**
 * Compact, always-visible shortcut rows under the save bar. Entries match
 * {@link listEventFormActions} so the list never advertises a chord that
 * cannot fire in the current form state.
 */
export function FormActionsShortcutList(options: EventFormActionListOptions) {
  const rows = listEventFormActions(options);

  return (
    <ul
      aria-label="Event form shortcuts"
      className="flex list-none flex-col gap-1.5 text-text-muted text-xs"
    >
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">{row.label}</span>
          <ShortcutKeys className="shrink-0" keys={[...row.keys]} />
        </li>
      ))}
    </ul>
  );
}
