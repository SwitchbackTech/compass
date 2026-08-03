import {
  ListBulletsIcon,
  ListNumbersIcon,
  TextBIcon,
  TextItalicIcon,
} from "@phosphor-icons/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import classNames from "classnames";
import DOMPurify from "dompurify";
import { type KeyboardEvent, useMemo, useState } from "react";
import { Divider } from "@web/components/Divider/Divider";

// Google's description HTML is untrusted input - strip everything but the
// formatting this editor actually supports. TipTap's own schema (StarterKit
// with headings/code/blockquote/etc disabled below) is a second filter: any
// surviving tag it doesn't recognize as a node/mark just becomes plain text.
const sanitizeDescriptionHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  });

interface DescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  editable: boolean;
  /**
   * Changes when the underlying event identity changes (switching which
   * event the sidebar is showing) - forces TipTap to recreate the editor
   * with fresh initial content instead of fighting the user's typing.
   * TipTap's `content` option is read once at creation, not resynced on
   * every render, so switching drafts needs an explicit remount signal.
   */
  resetKey: string;
  placeholder?: string;
  underlineColor?: string;
  onKeyDown?: (e: KeyboardEvent) => void;
  id?: string;
}

const TOOLBAR_BUTTON_CLASSNAME =
  "c-focus-ring flex size-6 items-center justify-center rounded text-text-muted hover:bg-border aria-pressed:bg-border aria-pressed:text-text";

export const DescriptionEditor = ({
  value,
  onChange,
  editable,
  resetKey,
  placeholder = "Description",
  underlineColor,
  onKeyDown,
  id,
}: DescriptionEditorProps) => {
  const [isFocused, setIsFocused] = useState(false);

  // Sanitizing is only meaningful for the editor's initial content - TipTap
  // reads `content` once at (re)creation, gated by the same [resetKey] below.
  // Recomputing it on every render would re-run a full HTML parse/filter pass
  // on every keystroke (onUpdate → onChange → parent re-render → this prop
  // ticks), for a value TipTap would just discard. Deliberately keyed on
  // resetKey only, matching useEditor's own [resetKey] below.
  const initialContent = useMemo(
    () => sanitizeDescriptionHtml(value),
    [resetKey],
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          blockquote: false,
          code: false,
          codeBlock: false,
          heading: false,
          horizontalRule: false,
          strike: false,
          underline: false,
          link: false,
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: initialContent,
      editable,
      // Supplying a custom `attributes` object replaces TipTap's own
      // defaults on the contenteditable element rather than merging with
      // them - role="textbox" has to be restored explicitly here alongside
      // the accessible name, or the editable region loses its ARIA role.
      editorProps: {
        attributes: {
          role: "textbox",
          "aria-label": placeholder,
          ...(id ? { id } : {}),
        },
      },
      onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
    },
    [resetKey],
  );

  // editor.isActive(...) is imperative editor-instance state, not reactive
  // React state - reading it directly in the render body would show a
  // toolbar button's pressed state one click stale, since toggling a mark
  // dispatches a ProseMirror transaction that doesn't by itself trigger a
  // re-render here. useEditorState subscribes to transactions and re-renders
  // this component when the selected value changes.
  const activeMarks = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            orderedList: current.isActive("orderedList"),
            bulletList: current.isActive("bulletList"),
          }
        : { bold: false, italic: false, orderedList: false, bulletList: false },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {editable && (
        <div
          className="flex items-center gap-0.5"
          role="toolbar"
          aria-label="Description formatting"
        >
          <button
            type="button"
            aria-label="Bold"
            aria-pressed={activeMarks.bold}
            className={TOOLBAR_BUTTON_CLASSNAME}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <TextBIcon size={14} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Italic"
            aria-pressed={activeMarks.italic}
            className={TOOLBAR_BUTTON_CLASSNAME}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <TextItalicIcon size={14} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Numbered list"
            aria-pressed={activeMarks.orderedList}
            className={TOOLBAR_BUTTON_CLASSNAME}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListNumbersIcon size={14} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Bullet list"
            aria-pressed={activeMarks.bulletList}
            className={TOOLBAR_BUTTON_CLASSNAME}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <ListBulletsIcon size={14} weight="bold" />
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={classNames(
          "c-rich-text relative w-full text-sm text-text",
          !editable && "cursor-default",
        )}
        onKeyDown={onKeyDown}
      />
      <Divider color={underlineColor} toggled={isFocused} />
    </div>
  );
};
