/**
 * Strip HTML to plain text for clipboard export. Uses the browser parser so
 * block tags become natural word breaks without pulling in a sanitizer.
 */
export function htmlToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  return doc.body.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
}
