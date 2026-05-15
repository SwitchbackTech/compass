import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";

const TRANSFORM_GLIDE_TIMING = "cubic-bezier(0.2, 0, 0, 1)";

export class DragOverlay {
  #node: HTMLElement | null = null;
  #previousCursor: {
    body: string;
    documentElement: string;
  } | null = null;

  mount({
    clone,
    cursor,
    rect,
    transformTransitionMs,
  }: {
    clone: HTMLElement;
    cursor?: string;
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
    clone.style.cursor = cursor ?? "";
    clone.style.transition = transformTransitionMs
      ? `transform ${transformTransitionMs}ms ${TRANSFORM_GLIDE_TIMING}`
      : "";
    clone.style.transform = "translate3d(0px, 0px, 0)";
    clone.style.willChange = "transform";
    clone.style.width = `${rect.width}px`;

    document.body.append(clone);
    if (cursor) {
      this.#previousCursor = {
        body: document.body.style.cursor,
        documentElement: document.documentElement.style.cursor,
      };
      document.body.style.cursor = cursor;
      document.documentElement.style.cursor = cursor;
    }
    this.#node = clone;
  }

  updateTransform(transform: VisualPoint) {
    if (!this.#node) {
      return;
    }

    this.#node.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }

  updateTimeLabel(label: string) {
    const timeLabel = this.#getOrCreateTimeLabel();

    if (!timeLabel) {
      return;
    }

    timeLabel.textContent = label;
  }

  #getOrCreateTimeLabel() {
    if (!this.#node) {
      return null;
    }

    const existing = this.#node.querySelector<HTMLElement>("[role='textbox']");

    if (existing) {
      return existing;
    }

    const timeLabel = document.createElement("span");
    timeLabel.setAttribute("data-week-interaction-time-label", "true");
    timeLabel.setAttribute("role", "textbox");
    timeLabel.style.display = "block";
    timeLabel.style.fontSize = "11px";
    timeLabel.style.left = "5px";
    timeLabel.style.lineHeight = "1.15";
    timeLabel.style.overflow = "hidden";
    timeLabel.style.pointerEvents = "none";
    timeLabel.style.position = "absolute";
    timeLabel.style.right = "3px";
    timeLabel.style.textOverflow = "ellipsis";
    timeLabel.style.top = "1px";
    timeLabel.style.whiteSpace = "nowrap";
    timeLabel.style.zIndex = "1";

    const title = this.#node.querySelector<HTMLElement>("span:not([role])");
    if (title) {
      title.style.visibility = "hidden";
    }

    this.#node.append(timeLabel);

    return timeLabel;
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
    if (this.#previousCursor) {
      document.body.style.cursor = this.#previousCursor.body;
      document.documentElement.style.cursor =
        this.#previousCursor.documentElement;
      this.#previousCursor = null;
    }
    this.#node?.remove();
    this.#node = null;
  }
}
