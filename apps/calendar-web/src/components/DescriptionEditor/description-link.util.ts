import { type Editor } from "@tiptap/react";

export const findLinkElement = (
  _root: HTMLElement,
  target: EventTarget | null,
): HTMLAnchorElement | null => {
  if (!(target instanceof HTMLElement)) return null;
  const link = target.closest("a[href]");
  return link instanceof HTMLAnchorElement ? link : null;
};

export const listDescriptionLinks = (root: HTMLElement): HTMLAnchorElement[] =>
  [...root.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(
    (link) => link.href.length > 0,
  );

export const linkAtCaret = (editor: Editor): HTMLAnchorElement | null => {
  const { view } = editor;
  const { from } = view.state.selection;
  const domAt = view.domAtPos(from);
  let node: Node | null = domAt.node;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  if (!(node instanceof HTMLElement)) return null;
  const link = node.closest("a[href]");
  return link instanceof HTMLAnchorElement ? link : null;
};

export const resolveDescriptionLinkToCopy = (
  editor: Editor,
  root: HTMLElement,
  activeLink: HTMLAnchorElement | null,
): string | null => {
  if (activeLink?.href) return activeLink.href;
  const caretLink = linkAtCaret(editor);
  if (caretLink?.href) return caretLink.href;
  const links = listDescriptionLinks(root);
  return links[0]?.href ?? null;
};

export const focusAdjacentDescriptionLink = (
  root: HTMLElement,
  current: HTMLAnchorElement,
  direction: "prev" | "next",
): boolean => {
  const links = listDescriptionLinks(root);
  const index = links.indexOf(current);
  if (index === -1) return false;
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  const target = links[nextIndex];
  if (!target) return false;
  target.focus();
  return true;
};
