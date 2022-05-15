import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { server } from "@web/common/__mocks__/server/mock.server";
import { LoginView } from "@web/views/Login";

describe("Login", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  it("displays oauth and feedback buttons", async () => {
    render(<LoginView />);
    const gOauthButton = screen.getByRole("button", {
      name: /sign up/i,
    });
    await waitFor(() => {
      expect(gOauthButton).toBeInTheDocument();
    });

    const feedbackButton = screen.getByText(/send feedback/i);
    expect(feedbackButton).toBeInTheDocument();
  });

  it("displays loading message after clicking sign up button", async () => {
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
    await waitFor(() => {
      expect(loadingEl).toBeInTheDocument();
    });
  });
});
