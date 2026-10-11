/** Whether Enter should run the welcome step's primary action instead of the focused control. */
export function shouldDelegateEnterToWelcomePrimary(
  activeElement: Element | null,
  primaryButton: HTMLButtonElement | null,
): boolean {
  if (!(activeElement instanceof HTMLElement)) return true;
  if (primaryButton && activeElement === primaryButton) return false;
  if (activeElement.isContentEditable) return false;
  const tag = activeElement.tagName;
  if (
    tag === "BUTTON" ||
    tag === "A" ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT"
  ) {
    return false;
  }
  return true;
}
