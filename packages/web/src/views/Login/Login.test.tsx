import React from "react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { LoginView } from "@web/views/Login";

it("renders google oauth button", () => {
  render(<LoginView />);
  const gOauthButton = screen.getByRole("button", {
    name: /connect my google calendar/i,
  });

  expect(gOauthButton).toBeInTheDocument;
});

it("shows loading message after clicking auth button", async () => {
  window.open = jest.fn();
  const { getByText } = render(<LoginView />);
  const user = userEvent.setup();
  const gOauthButton = screen.getByRole("button", {
    name: /connect my google calendar/i,
  });
  await user.click(gOauthButton);
  const loadingEl = screen.getByRole("heading", { name: /loading \.\.\./i });
  expect(loadingEl).toBeInTheDocument();
});
