import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { scrollTimedGridByPage } from "@web/grid/shortcuts/scroll-timed-grid";
import { afterEach, describe, expect, it, mock } from "bun:test";

describe("scrollTimedGridByPage", () => {
  afterEach(() => {
    document.getElementById(ID_GRID_MAIN)?.remove();
  });

  it("scrolls the timed grid by one viewport in the requested direction", () => {
    const grid = document.createElement("section");
    grid.id = ID_GRID_MAIN;
    Object.defineProperty(grid, "clientHeight", { value: 400 });
    const scrollBy = mock();
    grid.scrollBy = scrollBy as typeof grid.scrollBy;
    document.body.append(grid);

    expect(scrollTimedGridByPage("down")).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ top: 400 });

    expect(scrollTimedGridByPage("up")).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ top: -400 });
  });

  it("no-ops when the timed grid is not in the document", () => {
    expect(scrollTimedGridByPage("down")).toBe(false);
  });
});
