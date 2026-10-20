import { type Editor } from "@tiptap/react";
import { splitParagraphHardBreaksForListSelection } from "@web/components/DescriptionEditor/split-paragraph-hard-breaks";

export const toggleDescriptionList = (
  editor: Editor,
  list: "bullet" | "ordered",
) => {
  splitParagraphHardBreaksForListSelection(editor);
  const chain = editor.chain().focus();
  if (list === "bullet") {
    chain.toggleBulletList().run();
  } else {
    chain.toggleOrderedList().run();
  }
};
