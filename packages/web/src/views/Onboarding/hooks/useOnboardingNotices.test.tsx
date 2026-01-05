import { renderHook } from "@testing-library/react";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { useAuthPrompt } from "@web/views/Onboarding/hooks/useAuthPrompt";
import { useOnboardingNotices } from "@web/views/Onboarding/hooks/useOnboardingNotices";
import { useOnboardingOverlay } from "@web/views/Onboarding/hooks/useOnboardingOverlay";
import { useOnboardingProgress } from "@web/views/Onboarding/hooks/useOnboardingProgress";
import { useStoredTasks } from "@web/views/Onboarding/hooks/useStoredTasks";

jest.mock("@web/common/hooks/useGoogleAuth", () => ({
  useGoogleAuth: jest.fn(),
}));

jest.mock("@web/views/Onboarding/hooks/useOnboardingOverlay");
jest.mock("@web/views/Onboarding/hooks/useOnboardingProgress");
jest.mock("@web/views/Onboarding/hooks/useAuthPrompt");
jest.mock("@web/views/Onboarding/hooks/useStoredTasks");

const mockUseOnboardingOverlay = useOnboardingOverlay as jest.MockedFunction<
  typeof useOnboardingOverlay
>;
const mockUseOnboardingProgress = useOnboardingProgress as jest.MockedFunction<
  typeof useOnboardingProgress
>;
const mockUseAuthPrompt = useAuthPrompt as jest.MockedFunction<
  typeof useAuthPrompt
>;
const mockUseStoredTasks = useStoredTasks as jest.MockedFunction<
  typeof useStoredTasks
>;
const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<
  typeof useGoogleAuth
>;

describe("useOnboardingNotices", () => {
  beforeEach(() => {
    mockUseOnboardingOverlay.mockReturnValue({
      showOnboardingOverlay: false,
      currentStep: null,
      dismissOnboardingOverlay: jest.fn(),
    });
    mockUseGoogleAuth.mockReturnValue({ login: jest.fn(), loading: false });
    mockUseOnboardingProgress.mockReturnValue({ hasNavigatedDates: false });
    mockUseStoredTasks.mockReturnValue([]);
  });

  it("returns no notices when auth prompt is hidden", () => {
    mockUseAuthPrompt.mockReturnValue({
      showAuthPrompt: false,
      dismissAuthPrompt: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingNotices());

    expect(result.current.notices).toEqual([]);
  });

  it("returns auth prompt notice with header and body", () => {
    mockUseAuthPrompt.mockReturnValue({
      showAuthPrompt: true,
      dismissAuthPrompt: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingNotices());

    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0].header).toBe(
      "Sign in to sync across devices",
    );
    expect(result.current.notices[0].body).toContain(
      "Sign in to sync with Google Calendar",
    );
    expect(result.current.notices[0].primaryAction?.label).toBe("Sign in");
    expect(result.current.notices[0].secondaryAction?.label).toBe("Later");
  });
});
