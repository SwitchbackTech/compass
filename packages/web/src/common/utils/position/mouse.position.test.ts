import { getMousePosition } from "./mouse.position";

describe("getMousePosition", () => {
  const layout = {
    allDayRowBottom: 100,
    allDayRowTop: 50,
    gridYStart: 150,
    sidebarXStart: 200,
  };
  it("should return false when x is less than sidebarXStart", () => {
    const result = getMousePosition(layout, { x: 100, y: 100 });

    expect(result).toEqual({
      isOverGrid: false,
      isOverMainGrid: false,
      isOverAllDayRow: false,
    });
  });

  it("should return isOverAllDayRow as true when y is between allDayRowTop and allDayRowBottom", () => {
    const result = getMousePosition(layout, { x: 250, y: 75 });

    expect(result).toEqual({
      isOverGrid: true,
      isOverMainGrid: false,
      isOverAllDayRow: true,
    });
  });

  it("should return isOverMainGrid as true when y is greater than gridYStart", () => {
    const result = getMousePosition(layout, { x: 250, y: 200 });

    expect(result).toEqual({
      isOverGrid: true,
      isOverMainGrid: true,
      isOverAllDayRow: false,
    });
  });

  it("should return isOverGrid as false when y is less than allDayRowTop and gridYStart", () => {
    const result = getMousePosition(layout, { x: 250, y: 25 });

    expect(result).toEqual({
      isOverGrid: false,
      isOverMainGrid: false,
      isOverAllDayRow: false,
    });
  });
});
