import { act } from "react";
import { BrowserRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { AuthPrompt } from "./AuthPrompt";

jest.mock("@web/common/hooks/useGoogleAuth", () => ({
  useGoogleAuth: jest.fn(),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {component}
    </BrowserRouter>,
  );
};

describe("AuthPrompt", () => {
  const loginMock = jest.fn();
  const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<
    typeof useGoogleAuth
  >;

  beforeEach(() => {
    mockUseGoogleAuth.mockReturnValue({
      login: loginMock,
      loading: false,
    });
    loginMock.mockReset();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("should render sign in message", () => {
    const onDismiss = jest.fn();

    renderWithRouter(<AuthPrompt onDismiss={onDismiss} />);

    expect(
      screen.getByText("Sign in to sync across devices"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your tasks are saved locally/i),
    ).toBeInTheDocument();
  });

  it("should dismiss when 'Later' button is clicked", async () => {
    const onDismiss = jest.fn();

    renderWithRouter(<AuthPrompt onDismiss={onDismiss} />);

    const laterButton = screen.getByRole("button", { name: /later/i });
    await userEvent.click(laterButton);

    expect(onDismiss).toHaveBeenCalled();
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS) ?? "{}",
    );
    expect(stored.isAuthPromptDismissed).toBe(true);
  });

  it("should start Google login when 'Sign in' button is clicked", async () => {
    const onDismiss = jest.fn();

    renderWithRouter(<AuthPrompt onDismiss={onDismiss} />);

    const signInButton = screen.getByRole("button", { name: /sign in/i });
    await act(async () => {
      await userEvent.click(signInButton);
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
  });
});
