/** True for an unmodified single-letter key matching `letter` (case-insensitive). */
export const isBareLetterKey = (event: KeyboardEvent, letter: string) =>
  event.key.length === 1 &&
  event.key.toLowerCase() === letter &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey;
