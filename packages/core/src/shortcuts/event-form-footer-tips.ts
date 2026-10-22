import { KEYMAP } from "@core/shortcuts/keymap";

export type EventFormFooterTipPart =
  | string
  | { key: string }
  | { keys: readonly string[] };

export type EventFormFooterFocusContext = {
  focusInsideForm: boolean;
  /** False when Tab is trapped in a listbox or date popover. */
  tabNavigationApplies: boolean;
};

const FORM_FOOTER_TAB_PARTS = [
  { keys: ["Tab"] },
  " / ",
  { keys: ["Shift", "Tab"] },
  " between fields",
] as const satisfies readonly EventFormFooterTipPart[];

const FORM_FOOTER_ACTIONS_PARTS = [
  "Hold ",
  { key: KEYMAP.jumpFormField.holdModifier },
  " then ",
  { key: "0" },
  " for actions",
] as const satisfies readonly EventFormFooterTipPart[];

/**
 * Footer tips under Save while keyboard focus is inside the event form.
 * Segments are joined with a middle dot; omit segments that do not apply.
 */
export function buildEventFormFooterTipParts(
  ctx: EventFormFooterFocusContext,
): readonly EventFormFooterTipPart[] {
  if (!ctx.focusInsideForm) return [];

  const segments: readonly (readonly EventFormFooterTipPart[])[] = [
    ...(ctx.tabNavigationApplies ? [FORM_FOOTER_TAB_PARTS] : []),
    FORM_FOOTER_ACTIONS_PARTS,
  ];

  const parts: EventFormFooterTipPart[] = [];
  for (const [index, segment] of segments.entries()) {
    if (index > 0) parts.push(" · ");
    parts.push(...segment);
  }
  return parts;
}
