import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "@web/common/styles/theme";
import { afterAll, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

const signOut = mock();
const clearAuthenticationState = mock();
const getLastKnownEmail = mock();
const markUserAsAuthenticated = mock();

mock.module("@web/common/classes/Session", () => ({
  session: {
    signOut,
  },
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  clearAnonymousCalendarChangeSignUpPrompt: mock(),
  clearAuthenticationState,
  getAuthState: mock(),
  getLastKnownEmail,
  hasUserEverAuthenticated: mock(),
  markAnonymousCalendarChangeForSignUpPrompt: mock(),
  markUserAsAuthenticated,
  shouldShowAnonymousCalendarChangeSignUpPrompt: mock(),
  subscribeToAuthState: mock(),
  updateAuthState: mock(),
}));

const { LogoutView } = await import("./Logout");

describe("LogoutView", () => {
  it("navigates away even when session sign-out does not finish", async () => {
    signOut.mockReturnValue(new Promise(() => undefined));

    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter
          initialEntries={["/logout"]}
          future={{
            v7_relativeSplatPath: true,
            v7_startTransition: true,
          }}
        >
          <Routes>
            <Route path="/logout" element={<LogoutView />} />
            <Route path="/day" element={<div>Day view</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /signout/i }));

    await waitFor(() => {
      expect(screen.getByText("Day view")).toBeInTheDocument();
    });
    expect(clearAuthenticationState).toHaveBeenCalledTimes(1);
  });
});

afterAll(() => {
  mock.restore();
});
