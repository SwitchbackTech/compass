import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { DayOnboardingOverlays } from "@web/views/Day/components/OnboardingOverlay/DayOnboardingOverlays";
import { useOnboardingOverlays } from "@web/views/Day/hooks/onboarding/useOnboardingOverlays";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

jest.mock("@web/views/Day/hooks/onboarding/useOnboardingOverlays");
jest.mock("@web/views/Day/hooks/tasks/useTasks");

jest.mock("@web/views/Day/components/AuthPrompt/AuthPrompt", () => ({
  AuthPrompt: ({ onDismiss }: { onDismiss: () => void }) => (
    <button onClick={onDismiss}>Auth Prompt</button>
  ),
}));

const mockUseOnboardingOverlays = useOnboardingOverlays as jest.MockedFunction<
  typeof useOnboardingOverlays
>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

describe("DayOnboardingOverlays", () => {
  beforeEach(() => {
    mockUseOnboardingOverlays.mockReset();
    mockUseTasks.mockReturnValue({ tasks: [] } as ReturnType<typeof useTasks>);
  });

  it("does not render the auth prompt when it should be hidden", () => {
    mockUseOnboardingOverlays.mockReturnValue({
      showOnboardingOverlay: false,
      currentStep: null,
      showAuthPrompt: false,
      dismissOnboardingOverlay: jest.fn(),
      dismissAuthPrompt: jest.fn(),
    });

    render(<DayOnboardingOverlays />);

    expect(
      screen.queryByRole("button", { name: "Auth Prompt" }),
    ).not.toBeInTheDocument();
  });

  it("renders the auth prompt and dismisses it", async () => {
    const user = userEvent.setup();
    const dismissAuthPrompt = jest.fn();

    mockUseOnboardingOverlays.mockReturnValue({
      showOnboardingOverlay: false,
      currentStep: null,
      showAuthPrompt: true,
      dismissOnboardingOverlay: jest.fn(),
      dismissAuthPrompt,
    });

    render(<DayOnboardingOverlays />);

    const promptButton = screen.getByRole("button", { name: "Auth Prompt" });
    await user.click(promptButton);

    expect(dismissAuthPrompt).toHaveBeenCalledTimes(1);
  });
});
