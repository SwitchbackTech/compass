/**
 * @jest-environment jsdom
 */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import FetchUsers from "./FetchUsers";

describe("TestingDemo component", () => {
  test("it renders", () => {
    render(<FetchUsers />);
    expect(screen.getByText("Users:")).toBeInTheDocument();
  });
});
