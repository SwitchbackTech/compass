import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";

const TRANSFORM_GLIDE_TIMING = "cubic-bezier(0.2, 0, 0, 1)";

export class DragOverlay {
  #node: HTMLElement | null = null;

  mount({
    clone,
    rect,
    transformTransitionMs,
  }: {
    clone: HTMLElement;
    rect: VisualRect;
    transformTransitionMs?: number;
  }) {
    this.unmount();

    clone.style.contain = "layout paint style";
    clone.style.height = `${rect.height}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.position = "absolute";
    clone.style.pointerEvents = "none";
    clone.style.top = `${rect.top}px`;
    clone.style.transition = transformTransitionMs
      ? `transform ${transformTransitionMs}ms ${TRANSFORM_GLIDE_TIMING}`
      : "";
    clone.style.transform = "translate3d(0px, 0px, 0)";
    clone.style.willChange = "transform";
    clone.style.width = `${rect.width}px`;

    document.body.append(clone);
    this.#node = clone;
  }

  updateTransform(transform: VisualPoint) {
    if (!this.#node) {
      return;
    }

    this.#node.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }

  updateTimeLabel(label: string) {
    const timeLabel =
      this.#node?.querySelector<HTMLElement>("[role='textbox']");

    if (!timeLabel) {
      return;
    }

    timeLabel.textContent = label;
  }

  updateResize({
    height,
    transform,
    width,
  }: {
    height: number;
    transform: VisualPoint;
    width?: number;
  }) {
    if (!this.#node) {
      return;
    }

    this.#node.style.height = `${height}px`;
    if (width !== undefined) {
      this.#node.style.width = `${width}px`;
    }
    this.#node.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }

  unmount() {
    this.#node?.remove();
    this.#node = null;
  }
}
