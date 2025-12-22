import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import {
  checkAABBCollision,
  collisionDetector,
  collisionWidth,
  findOptimalPlacement,
  getOrder,
  gridOrganization$,
  isTimedEventNode,
  processNode,
  reorderGrid,
  resetPosition,
  sortByOrderAndWidthAttribute,
} from "@web/common/utils/dom/grid-organization.util";

describe("grid-organization.util", () => {
  const rectMap = new Map<HTMLElement, DOMRect>();

  beforeAll(() => {
    jest
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const rect = rectMap.get(this);
        return (
          rect ||
          ({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            toJSON: () => {},
          } as DOMRect)
        );
      });
  });

  afterEach(() => {
    rectMap.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("checkAABBCollision", () => {
    it("should return true for overlapping rects", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 } as DOMRect;
      const rectB = { x: 50, y: 50, width: 100, height: 100 } as DOMRect;
      expect(checkAABBCollision(rectA, rectB)).toBe(true);
    });

    it("should return false for non-overlapping rects", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 } as DOMRect;
      const rectB = { x: 200, y: 200, width: 100, height: 100 } as DOMRect;
      expect(checkAABBCollision(rectA, rectB)).toBe(false);
    });
  });

  describe("isTimedEventNode", () => {
    it("should return true if node has the class", () => {
      const node = document.createElement("div");
      node.classList.add(CLASS_TIMED_CALENDAR_EVENT);
      expect(isTimedEventNode(node)).toBe(true);
    });

    it("should return false if node does not have the class", () => {
      const node = document.createElement("div");
      expect(isTimedEventNode(node)).toBe(false);
    });
  });

  describe("collisionDetector", () => {
    it("should return colliding nodes", () => {
      const node = document.createElement("div");
      node.id = "node1";
      rectMap.set(node, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
        toJSON: () => {},
      });

      const otherNode = document.createElement("div");
      otherNode.id = "node2";
      rectMap.set(otherNode, {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        top: 50,
        right: 150,
        bottom: 150,
        left: 50,
        toJSON: () => {},
      });

      const nonCollidingNode = document.createElement("div");
      nonCollidingNode.id = "node3";
      rectMap.set(nonCollidingNode, {
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        top: 200,
        right: 300,
        bottom: 300,
        left: 200,
        toJSON: () => {},
      });

      const collisions = collisionDetector(node, [
        node,
        otherNode,
        nonCollidingNode,
      ]);
      expect(collisions).toHaveLength(1);
      expect(collisions[0]).toBe(otherNode);
    });
  });

  describe("collisionWidth", () => {
    it("should return container width when no collisions", () => {
      const width = collisionWidth([], 1000, 200);
      expect(width).toBe(1000);
    });

    it("should return a max width - half container width - when collisions exist", () => {
      const node = document.createElement("div");
      const width = collisionWidth([node], 1000, 200);
      expect(width).toBe(500);
    });

    it("should respect min width based on collision count", () => {
      const node1 = document.createElement("div");
      const node2 = document.createElement("div");
      const node3 = document.createElement("div");
      // 4 items total (1 current + 3 colliding)
      // minWidth = 1000 / 4 = 250
      // maxWidth = 500
      // width passed = 200
      // max(250, 200) = 250
      // min(500, 250) = 250
      const width = collisionWidth([node1, node2, node3], 1000, 200);
      expect(width).toBe(250);
    });
  });

  describe("findOptimalPlacement", () => {
    it("should return placement styles", () => {
      const node = document.createElement("div");
      Object.defineProperty(node, "offsetWidth", {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(node, "offsetHeight", {
        configurable: true,
        value: 100,
      });

      const collidingNode = document.createElement("div");
      Object.defineProperty(collidingNode, "offsetWidth", {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(collidingNode, "offsetHeight", {
        configurable: true,
        value: 100,
      });

      const containerWidth = 1000;
      const width = 500;

      const placement = findOptimalPlacement(
        node,
        [collidingNode],
        containerWidth,
        width,
      );

      expect(placement.style).toHaveProperty("left");
      expect(placement.style).toHaveProperty("width", "498px");
      expect(placement.style).toHaveProperty("zIndex");
    });
  });

  describe("processNode", () => {
    it("should return CSS properties", () => {
      const node = document.createElement("div");
      rectMap.set(node, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
        toJSON: () => {},
      });
      Object.defineProperty(node, "innerText", { value: "Test Event" });

      const gridRect = { width: 1000 } as DOMRect;
      const nodes = [node];

      const styles = processNode(node, nodes, gridRect);
      expect(styles).toBeDefined();
    });
  });

  describe("reorderGrid", () => {
    it("should update styles of nodes", () => {
      const mainGrid = document.createElement("div");
      rectMap.set(mainGrid, {
        width: 1000,
        x: 0,
        y: 0,
        height: 1000,
        top: 0,
        right: 1000,
        bottom: 1000,
        left: 0,
        toJSON: () => {},
      });

      const node1 = document.createElement("div");
      node1.classList.add(CLASS_TIMED_CALENDAR_EVENT);
      rectMap.set(node1, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
        toJSON: () => {},
      });

      const node2 = document.createElement("div");
      node2.classList.add(CLASS_TIMED_CALENDAR_EVENT);
      rectMap.set(node2, {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        top: 50,
        right: 150,
        bottom: 150,
        left: 50,
        toJSON: () => {},
      });

      mainGrid.appendChild(node1);
      mainGrid.appendChild(node2);

      reorderGrid(mainGrid);

      expect(node1.style.width).toBeDefined();
      expect(node2.style.width).toBeDefined();
    });
  });

  describe("getOrder", () => {
    it("should return the order from gridOrganization$", () => {
      const node = document.createElement("div");
      const id = "test-event-id";
      node.setAttribute(DATA_EVENT_ELEMENT_ID, id);

      gridOrganization$.next({
        [id]: { order: 5, isOverlapping: false, style: {}, fullWidth: false },
      });

      expect(getOrder(node)).toBe(5);
    });

    it("should return 0 if id is missing", () => {
      const node = document.createElement("div");
      expect(getOrder(node)).toBe(0);
    });

    it("should return 0 if order is missing in gridOrganization$", () => {
      const node = document.createElement("div");
      const id = "test-event-id-2";
      node.setAttribute(DATA_EVENT_ELEMENT_ID, id);
      // gridOrganization$ doesn't have this id
      expect(getOrder(node)).toBe(0);
    });
  });

  describe("sortByOrderAndWidthAttribute", () => {
    it("should sort based on offsetWidth and order", () => {
      const nodeA = document.createElement("div");
      Object.defineProperty(nodeA, "offsetWidth", { value: 100 });
      nodeA.setAttribute("data-order", "1");

      const nodeB = document.createElement("div");
      Object.defineProperty(nodeB, "offsetWidth", { value: 200 });
      nodeB.setAttribute("data-order", "2");

      // b (200+2) - a (100+1) = 202 - 101 > 0 -> b comes first
      expect(sortByOrderAndWidthAttribute(nodeA, nodeB)).toBeGreaterThan(0);
      expect(sortByOrderAndWidthAttribute(nodeB, nodeA)).toBeLessThan(0);
    });
  });

  describe("resetPosition", () => {
    it("should reset styles", () => {
      const node = document.createElement("div");
      node.style.width = "100px";
      node.style.left = "10px";
      node.style.zIndex = "5";

      resetPosition(node);

      expect(node.style.width).toBe("");
      expect(node.style.left).toBe("");
      expect(node.style.zIndex).toBe("");
    });
  });
});
