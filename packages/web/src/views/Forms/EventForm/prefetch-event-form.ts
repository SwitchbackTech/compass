let prefetchStarted = false;

/**
 * Starts downloading the lazy EventForm chunk (TipTap, react-datepicker,
 * react-select, and the form tree) ahead of the form opening. Safe to call
 * repeatedly; only the first call triggers the import.
 */
export const prefetchEventForm = (): void => {
  if (prefetchStarted) return;
  prefetchStarted = true;
  void import("@web/views/Forms/EventForm/EventForm");
};
