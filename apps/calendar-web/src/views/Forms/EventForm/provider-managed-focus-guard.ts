import { type EventFormFocusField } from "@core/shortcuts/event-form-focus-field";

type ProviderManagedFocusGuard = (field: EventFormFocusField) => boolean;

let activeGuard: ProviderManagedFocusGuard | null = null;

export function setEventFormProviderManagedFocusGuard(
  guard: ProviderManagedFocusGuard | null,
): void {
  activeGuard = guard;
}

export function allowEventFormFieldFocus(field: EventFormFocusField): boolean {
  return activeGuard ? activeGuard(field) : true;
}
