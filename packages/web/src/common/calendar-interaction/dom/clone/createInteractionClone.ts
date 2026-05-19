export const createInteractionClone = (source: HTMLElement) => {
  const clone = source.cloneNode(true) as HTMLElement;

  for (const element of [clone, ...clone.querySelectorAll<HTMLElement>("*")]) {
    element.removeAttribute("id");
    element.removeAttribute("tabindex");
    element.removeAttribute("aria-describedby");
    element.removeAttribute("aria-controls");
    element.removeAttribute("aria-labelledby");
  }

  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-calendar-interaction-overlay", "true");
  clone.style.margin = "0";
  clone.style.pointerEvents = "none";

  return clone;
};
