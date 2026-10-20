import { TextSelection } from "@tiptap/pm/state";
import { type Editor } from "@tiptap/react";

/**
 * TipTap list toggles operate on block nodes. Plain-text descriptions often
 * load as one paragraph with hardBreak nodes between lines; partial selections
 * then turn the whole paragraph into a single list item. Split every hard
 * break in touched paragraphs into separate paragraphs before list commands.
 */
export const splitParagraphHardBreaksForListSelection = (
  editor: Editor,
): boolean => {
  const { state } = editor;
  const { from, to } = state.selection;
  const hardBreak = state.schema.nodes.hardBreak;
  const paragraph = state.schema.nodes.paragraph;
  if (!hardBreak || !paragraph) {
    return false;
  }

  const breakPositions: number[] = [];
  state.doc.descendants((node, pos) => {
    if (node.type !== paragraph) {
      return;
    }
    const paragraphEnd = pos + node.nodeSize;
    if (paragraphEnd <= from || pos >= to) {
      return;
    }
    node.forEach((child, offset) => {
      if (child.type === hardBreak) {
        breakPositions.push(pos + 1 + offset);
      }
    });
  });

  if (breakPositions.length === 0) {
    return false;
  }

  breakPositions.sort((left, right) => right - left);
  let tr = state.tr;
  for (const position of breakPositions) {
    tr = tr.delete(position, position + 1);
    tr = tr.split(position);
  }

  const mappedFrom = tr.mapping.map(from);
  const mappedTo = tr.mapping.map(to);
  tr.setSelection(
    TextSelection.create(tr.doc, mappedFrom, Math.max(mappedFrom, mappedTo)),
  );
  editor.view.dispatch(tr);
  return true;
};
