import { ZIndex } from "@web/common/constants/web.constants";
import { type CalendarInteractionPoint } from "../../CalendarInteractionSession";

export class FloatingInteractionOverlay {
  #node: HTMLElement | null = null;

  mount({
    clone,
    rect,
  }: {
    clone: HTMLElement;
    rect: {
      height: number;
      left: number;
      top: number;
      width: number;
    };
  }) {
    this.unmount();

    clone.style.contain = "layout paint style";
    clone.style.height = `${rect.height}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.position = "fixed";
    clone.style.pointerEvents = "none";
    clone.style.top = `${rect.top}px`;
    clone.style.transition = "none";
    clone.style.transform = "translate3d(0px, 0px, 0)";
    clone.style.willChange = "transform";
    clone.style.width = `${rect.width}px`;
    clone.style.zIndex = `${ZIndex.MAX}`;

    document.body.append(clone);
    this.#node = clone;
  }

  update({
    height,
    mutate,
    transform,
    width,
  }: {
    height?: number;
    mutate?: (node: HTMLElement) => void;
    transform: CalendarInteractionPoint;
    width?: number;
  }) {
    if (!this.#node) {
      return;
    }

    if (height !== undefined) {
      this.#node.style.height = `${height}px`;
    }

    if (width !== undefined) {
      this.#node.style.width = `${width}px`;
    }

    mutate?.(this.#node);
    this.#node.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }

  getNode() {
    return this.#node;
  }

  unmount() {
    this.#node?.remove();
    this.#node = null;
  }
}
