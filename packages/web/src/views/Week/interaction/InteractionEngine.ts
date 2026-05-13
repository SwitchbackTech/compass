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

interface InteractionMotionOptions {
  notifyReact?: boolean;
}

type InteractionMotionListener = (snapshot: InteractionState) => void;

export class InteractionEngine {
  private readonly store: InteractionStore;
  private readonly motionListeners = new Set<InteractionMotionListener>();

  constructor(store: InteractionStore = createInteractionStore()) {
    this.store = store;
  }

  getSnapshot(): InteractionState {
    return this.store.getSnapshot();
  }

  getStore(): InteractionStore {
    return this.store;
  }

  subscribeMotion(listener: InteractionMotionListener): () => void {
    this.motionListeners.add(listener);

    return () => {
      this.motionListeners.delete(listener);
    };
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

  updateDraft(
    draft: Schema_GridEvent,
    options: InteractionMotionOptions = {},
  ): void {
    this.store.setState({ draft }, { notify: options.notifyReact ?? true });
    this.emitMotion();
  }

  reset(): void {
    this.store.reset();
  }

  updatePointer(
    pointer: InteractionPointer,
    options: InteractionMotionOptions = {},
  ): void {
    this.store.updatePointer(pointer, {
      notify: options.notifyReact ?? true,
    });
  }

  private emitMotion(): void {
    const snapshot = this.getSnapshot();

    for (const listener of this.motionListeners) {
      listener(snapshot);
    }
  }
}
