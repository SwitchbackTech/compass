import React from "react";
import { act, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { LoginView } from "@web/views/Login";

// wip cuz .png breaks
// see if these work after converting png to custom button

import { render } from "../__mocks__/mock.render";
describe("Login", () => {
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
