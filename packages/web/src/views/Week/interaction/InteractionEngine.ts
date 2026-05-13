import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  createInteractionStore,
  type InteractionStore,
} from "./interaction.store";
import {
  type InteractionPointer,
  type InteractionState,
} from "./interaction.types";

interface DraftStateMirror {
  draft: Schema_GridEvent | null;
  isDragging: boolean;
  isResizing: boolean;
}

export class InteractionEngine {
  private readonly store: InteractionStore;

  constructor(store: InteractionStore = createInteractionStore()) {
    this.store = store;
  }

  getSnapshot(): InteractionState {
    return this.store.getSnapshot();
  }

  getStore(): InteractionStore {
    return this.store;
  }

  mirrorDraftState(state: DraftStateMirror): void {
    const mode = state.isDragging
      ? "drag"
      : state.isResizing
        ? "resize"
        : "idle";

    this.store.setState({
      draft: state.draft,
      mode,
      pointer: mode === "idle" ? null : this.store.getSnapshot().pointer,
    });
  }

  updateDraft(draft: Schema_GridEvent): void {
    this.store.setState({ draft });
  }

  reset(): void {
    this.store.reset();
  }

  updatePointer(pointer: InteractionPointer): void {
    this.store.updatePointer(pointer);
  }
}
