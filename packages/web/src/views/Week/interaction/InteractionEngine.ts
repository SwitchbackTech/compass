import dayjs from "@core/util/date/dayjs";
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
    const snapshot = this.store.getSnapshot();

    if (state.draft === null) {
      if (snapshot.mode !== "idle" && snapshot.draft !== null) {
        return;
      }

      this.store.setState({
        draft: null,
        mode: "idle",
        pointer: null,
      });
      return;
    }

    const currentMode = snapshot.mode;
    const mode = state.isResizing
      ? "resize"
      : currentMode === "drag" || currentMode === "resize"
        ? currentMode
        : "idle";

    this.store.setState({
      draft: state.draft,
      mode,
      pointer: mode === "idle" ? null : snapshot.pointer,
    });
  }

  markDragMoved(): void {
    const snapshot = this.store.getSnapshot();
    this.store.setState(
      {
        drag: {
          ...snapshot.drag,
          hasMoved: true,
        },
      },
      { notify: false },
    );
  }

  markResizeMoved(): void {
    this.store.setState(
      {
        resize: {
          hasMoved: true,
        },
      },
      { notify: false },
    );
  }

  startDrag(draft: Schema_GridEvent | null): void {
    if (!draft) return;

    this.store.setState({
      draft,
      mode: "drag",
      drag: {
        durationMin: dayjs(draft.endDate).diff(draft.startDate, "minutes"),
        hasMoved: false,
      },
      resize: {
        hasMoved: false,
      },
    });
  }

  startResize(draft: Schema_GridEvent | null): void {
    if (!draft) return;

    this.store.setState({
      draft,
      mode: "resize",
      drag: {
        durationMin: null,
        hasMoved: false,
      },
      resize: {
        hasMoved: false,
      },
    });
  }

  stopInteraction(): void {
    this.store.setState({
      drag: {
        durationMin: null,
        hasMoved: false,
      },
      mode: "idle",
      pointer: null,
      resize: {
        hasMoved: false,
      },
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
