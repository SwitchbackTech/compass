import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { listHintShortcutCelebrationKeys } from "@core/shortcuts/hint-shortcut-celebration.util";
import { IS_DEV } from "@web/common/constants/env.constants";
import { type ShortcutTipPart } from "@web/shortcuts/tips/shortcut-tips.data";

export type VisibleShortcutHint = {
  hintId: string;
  parts: readonly ShortcutTipPart[];
  celebrationKeys: readonly string[];
};

type VisibleShortcutHintState = {
  sidebar: VisibleShortcutHint | null;
  formFooter: VisibleShortcutHint | null;
};

const initialState: VisibleShortcutHintState = {
  sidebar: null,
  formFooter: null,
};

export const useVisibleShortcutHintStore = create<VisibleShortcutHintState>()(
  devtools(() => initialState, {
    name: "compass/visibleShortcutHint",
    enabled: IS_DEV,
  }),
);

export const visibleShortcutHintActions = {
  setSidebarHint: (hint: { id: string; parts: readonly ShortcutTipPart[] }) => {
    useVisibleShortcutHintStore.setState(
      {
        sidebar: {
          hintId: hint.id,
          parts: hint.parts,
          celebrationKeys: listHintShortcutCelebrationKeys(hint.id, hint.parts),
        },
      },
      false,
      { type: "setSidebarHint" },
    );
  },
  clearSidebarHint: () => {
    useVisibleShortcutHintStore.setState({ sidebar: null }, false, {
      type: "clearSidebarHint",
    });
  },
  setFormFooterHint: (hint: {
    id: string;
    parts: readonly ShortcutTipPart[];
  }) => {
    useVisibleShortcutHintStore.setState(
      {
        formFooter: {
          hintId: hint.id,
          parts: hint.parts,
          celebrationKeys: listHintShortcutCelebrationKeys(hint.id, hint.parts),
        },
      },
      false,
      { type: "setFormFooterHint" },
    );
  },
  clearFormFooterHint: () => {
    useVisibleShortcutHintStore.setState({ formFooter: null }, false, {
      type: "clearFormFooterHint",
    });
  },
};

export function readVisibleHintCelebrationKeys(): readonly string[] {
  const { sidebar, formFooter } = useVisibleShortcutHintStore.getState();
  const keys = [...(sidebar?.celebrationKeys ?? [])];
  if (formFooter) keys.push(...formFooter.celebrationKeys);
  return keys;
}

export function resetVisibleShortcutHintStoreForTests(): void {
  useVisibleShortcutHintStore.setState(initialState, true);
}
