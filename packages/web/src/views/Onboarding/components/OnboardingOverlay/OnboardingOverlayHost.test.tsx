import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { OnboardingOverlayHost } from "@web/views/Onboarding/components/OnboardingOverlay/OnboardingOverlayHost";
import { useOnboardingNotices } from "@web/views/Onboarding/hooks/useOnboardingNotices";

jest.mock("@web/views/Onboarding/hooks/useOnboardingNotices");

const mockUseOnboardingNotices = useOnboardingNotices as jest.MockedFunction<
  typeof useOnboardingNotices
>;

describe("OnboardingOverlayHost", () => {
  beforeEach(() => {
    mockUseOnboardingNotices.mockReset();
  });

  it("renders nothing when there are no notices", () => {
    mockUseOnboardingNotices.mockReturnValue({ notices: [] });

    render(<OnboardingOverlayHost />);

    expect(
      screen.queryByText("Sign in to sync across devices"),
    ).not.toBeInTheDocument();
  });

  it("renders notice content and handles actions", async () => {
    const user = userEvent.setup();
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();

    mockUseOnboardingNotices.mockReturnValue({
      notices: [
        {
          id: "auth-prompt",
          header: "Sign in to sync across devices",
          body: "Your tasks are saved locally.",
          primaryAction: { label: "Sign in", onClick: onPrimary },
          secondaryAction: { label: "Later", onClick: onSecondary },
        },
      ],
    });

    render(<OnboardingOverlayHost />);

    expect(
      screen.getByText("Sign in to sync across devices"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your tasks are saved locally."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.click(screen.getByRole("button", { name: "Later" }));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});
