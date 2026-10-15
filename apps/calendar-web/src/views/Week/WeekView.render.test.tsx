import { type FC, useRef } from "react";
import {
  afterEach,
  describe,
  expect,
  it,
  setSystemTime,
  spyOn,
} from "bun:test";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { useScroll } from "@web/views/Week/hooks/grid/useScroll";

describe("Scroll", () => {
  afterEach(() => {
    setSystemTime();
  });

  it("only scrolls once", () => {
    setSystemTime(new Date("2026-02-05T12:00:00.000Z"));

    const ScrollHarness: FC = () => {
      const ref = useRef<HTMLDivElement | null>(null);
      useScroll(ref);
      return <div ref={ref} />;
    };

    const clientHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientHeight",
    );
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 1440,
    });

    const scrollSpy = spyOn(window.HTMLElement.prototype, "scroll");

    render(<ScrollHarness />);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    scrollSpy.mockRestore();
    if (clientHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "clientHeight",
        clientHeight,
      );
    }
  });
});
