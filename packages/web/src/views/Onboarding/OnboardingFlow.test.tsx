import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import OnboardingFlow from "@web/views/Onboarding/OnboardingFlow";

// Mock react-router-dom Navigate component
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate" data-to={to}>
      Navigating to {to}
    </div>
  ),
  useLocation: () => ({ pathname: "/onboarding" }),
}));

describe("OnboardingFlow", () => {
  it("redirects to /day route", () => {
    render(<OnboardingFlow />);

    // Should render Navigate component redirecting to /day
    const navigate = screen.getByTestId("navigate");
    expect(navigate).toBeInTheDocument();
    expect(navigate).toHaveAttribute("data-to", ROOT_ROUTES.DAY);
  });
});
