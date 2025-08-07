/**
 * Escapes special regex characters in a string to prevent regex injection attacks
 * @param str - The string to escape
 * @returns The escaped string safe for use in regex patterns
 */
export const cleanRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
