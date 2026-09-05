// Outlook calendar theme presets when Graph returns the named color enum but
// no hexColor (common for auto and never-customized calendars).
export const MICROSOFT_CALENDAR_COLOR_HEX: Readonly<
  Record<string, string | null>
> = {
  auto: null,
  lightBlue: "#0078D4",
  lightGreen: "#107C10",
  lightOrange: "#D83B01",
  lightGray: "#666666",
  lightYellow: "#FFB900",
  lightTeal: "#008272",
  lightPink: "#E3008C",
  lightBrown: "#986F0B",
  lightRed: "#D13438",
  maxColor: null,
};

export function resolveMicrosoftCalendarColor(
  hexColor: string | null | undefined,
  color: string | null | undefined,
): string | null {
  const trimmedHex = hexColor?.trim();
  if (trimmedHex) return trimmedHex;
  if (!color) return null;
  return MICROSOFT_CALENDAR_COLOR_HEX[color] ?? null;
}
