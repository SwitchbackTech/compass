import React from "react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { act, render, screen, waitFor } from "@testing-library/react";
import { LoginView } from "@web/views/Login";
import { API_BASEURL } from "@web/common/constants/web.constants";

describe("Login Tests", () => {
  // move to setup file
  const server = setupServer(
    rest.get(`${API_BASEURL}/auth/oauth-url`, (req, res, ctx) => {
      return res(ctx.json({ authUrl: "foo", authState: "bar" }));
    }),
    rest.get("/api/auth/oauth-status", (req, res, ctx) => {
      return res(
        ctx.json({ isOauthComplete: false, refreshNeeded: false, token: "noo" })
      );
    })
  );

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });

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
    await waitFor(() => {
      expect(loadingEl).toBeInTheDocument();
    });
  });
});
