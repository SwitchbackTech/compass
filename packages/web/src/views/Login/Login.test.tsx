import React from "react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor } from "@testing-library/react";
import { LoginView } from "@web/views/Login";

it("renders oauth and feedback buttons", async () => {
  render(<LoginView />);
  const gOauthButton = screen.getByRole("button", {
    name: /sign up/i,
  });
  await waitFor(() => {
    expect(gOauthButton).toBeInTheDocument;
  });

  const feedbackButton = screen.getByText(/send feedback/i);
  expect(feedbackButton).toBeInTheDocument;
});

it("shows loading message after clicking auth button", async () => {
  window.open = jest.fn();
  render(<LoginView />);
  const user = userEvent.setup();

  const gOauthButton = screen.getByRole("button", {
    name: /sign up/i,
  });
  await act(async () => {
    await user.click(gOauthButton);
  });

  const loadingEl = screen.getByRole("heading", { name: /loading \.\.\./i });
  expect(loadingEl).toBeInTheDocument();
});
