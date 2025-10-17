import { getTaskIdFromElement } from "./task.locate";

describe("getTaskIdFromElement", () => {
  it("returns task ID when element has data-task-id attribute", () => {
    const element = document.createElement("div");
    element.setAttribute("data-task-id", "task-123");

    const result = getTaskIdFromElement(element);
    expect(result).toBe("task-123");
  });

  it("returns task ID when element is child of element with data-task-id", () => {
    const parentElement = document.createElement("div");
    parentElement.setAttribute("data-task-id", "task-456");

    const childElement = document.createElement("span");
    parentElement.appendChild(childElement);

    const result = getTaskIdFromElement(childElement);
    expect(result).toBe("task-456");
  });

  it("returns null when no data-task-id found in parent chain", () => {
    const element = document.createElement("div");
    element.setAttribute("data-other-attr", "some-value");

    const result = getTaskIdFromElement(element);
    expect(result).toBeNull();
  });
});
