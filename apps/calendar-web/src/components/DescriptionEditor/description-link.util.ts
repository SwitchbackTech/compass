import { type Editor } from "@tiptap/react";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";

export const DESCRIPTION_LINK_COPIED_TOAST_ID = "description-link-copied";

export const findLinkElement = (
  root: HTMLElement,
  target: EventTarget | null,
): HTMLAnchorElement | null => {
  if (!(target instanceof HTMLElement) || !root.contains(target)) return null;
  const link = target.closest("a[href]");
  return link instanceof HTMLAnchorElement ? link : null;
};

export const copyDescriptionLinkUrl = async (url: string): Promise<boolean> => {
  const didCopy = await copyText(url);
  if (didCopy) {
    showStatusToast(DESCRIPTION_LINK_COPIED_TOAST_ID, "Link copied");
  }
  return didCopy;
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
