/**
 * @jest-environment jsdom
 */
import React from "react";
import Button from ".";
import { render } from "@testing-library/react";
import "jest-styled-components";

describe("Testing Styles", () => {
  test("button snapshot works", () => {
    const { container } = render(<Button />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // test("color matches", () => {
  //   render(<Button />);
  //   expect(Button).toHaveStyleRule("color", "red");
  // });
});
