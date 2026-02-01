import { useLocation } from "react-router-dom";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { act, render, screen } from "@web/__tests__/__mocks__/mock.render";
import { useSession } from "@web/auth/hooks/session/useSession";
import {
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStepDetection } from "../hooks/useStepDetection";
import { markStepCompleted } from "../utils/onboarding.storage.util";
import { OnboardingGuide } from "./OnboardingGuide";

// Mock posthog to avoid transitive dependency issues in tests
jest.mock("posthog-js/react", () => ({
  usePostHog: () => ({
    identify: jest.fn(),
    capture: jest.fn(),
  }),
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the hooks before importing the component
jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
}));
jest.mock("@web/auth/hooks/session/useSession");
jest.mock("../hooks/useCmdPaletteGuide");
jest.mock("../hooks/useStepDetection");
jest.mock("@web/common/utils/storage/storage.util", () => ({
  getDateKey: jest.fn(() => "2024-01-01"),
  loadTasksFromStorage: jest.fn(() => []),
}));

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseCmdPaletteGuide = useCmdPaletteGuide as jest.MockedFunction<
  typeof useCmdPaletteGuide
>;
const mockUseStepDetection = useStepDetection as jest.MockedFunction<
  typeof useStepDetection
>;

const mockGetDateKey = getDateKey as jest.MockedFunction<typeof getDateKey>;
const mockLoadTasksFromStorage = loadTasksFromStorage as jest.MockedFunction<
  typeof loadTasksFromStorage
>;

describe("CmdPaletteGuide", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseStepDetection.mockImplementation(() => {});
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });
    mockGetDateKey.mockReturnValue("2024-01-01");
    mockLoadTasksFromStorage.mockReturnValue([]); // No tasks by default
  });

  it("should not render when guide is not active", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: null,
      isGuideActive: false,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.queryByText("Welcome to Compass")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Day View"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Now View"),
    ).not.toBeInTheDocument();
  });

  it("should render create task instructions on Day view when day step is completed", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // No tasks yet
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Type c to create a task" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument(); // The kbd element
    expect(screen.getByLabelText("Skip guide")).toBeInTheDocument();
  });

  it("should render step 1 on Now view when on step 1", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 2 to go to the Day view" ?? false,
      ),
    ).toBeInTheDocument();
  });

  it("should render step 3 instructions on Now view when day and task steps are completed", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockLoadTasksFromStorage.mockReturnValue([
      {
        id: "task-1",
        title: "Test task",
        status: "todo",
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ] as any); // Step 1 completed
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 1 to go to the Now view" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // The kbd element
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
  });

  it("should show step 1 instructions on Now view when step 1 is not completed", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 2 to go to the Day view" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("should render step 1 instructions on Week view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Week View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 2 to go to the Day view" ?? false,
      ),
    ).toBeInTheDocument();
  });

  it("should render step 3 instructions on Week view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/" } as any);
    mockLoadTasksFromStorage.mockReturnValue([
      {
        id: "task-1",
        title: "Test task",
        status: "todo",
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ] as any);
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Week View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 1 to go to the Now view" ?? false,
      ),
    ).toBeInTheDocument();
  });

  it("should render step 3 instructions on Day view when day and task steps are completed", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockLoadTasksFromStorage.mockReturnValue([
      {
        id: "task-1",
        title: "Test task",
        status: "todo",
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ] as any); // Step 1 completed
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 1 to go to the Now view" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // The kbd element
  });

  it("should show step 1 instructions on Day view when step 1 is not completed", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    // Should show step 1 instructions instead since step 1 wasn't completed
    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_, element) =>
          element?.textContent === "You're already on the Day view." ?? false,
      )[0],
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("should render on Day view when authenticated", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    const mockSession = {
      authenticated: true,
      setAuthenticated: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Type c to create a task" ?? false,
      ),
    ).toBeInTheDocument();
  });

  it("should call skipGuide when skip button is clicked on Day view", async () => {
    const user = userEvent.setup();
    const skipGuide = jest.fn();
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide,
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    const skipButton = screen.getByLabelText("Skip guide");
    await user.click(skipButton);

    expect(skipGuide).toHaveBeenCalledTimes(1);
  });

  it("should call skipGuide when skip button is clicked on Now view", async () => {
    const user = userEvent.setup();
    const skipGuide = jest.fn();
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockLoadTasksFromStorage.mockReturnValue([
      {
        id: "task-1",
        title: "Test task",
        status: "todo",
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ] as any); // Step 1 completed
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide,
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    const skipButton = screen.getByLabelText("Skip guide");
    await user.click(skipButton);

    expect(skipGuide).toHaveBeenCalledTimes(1);
  });

  it("should show progress indicators correctly on Now view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockLoadTasksFromStorage.mockReturnValue([
      {
        id: "task-1",
        title: "Test task",
        status: "todo",
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ] as any); // Step 1 completed
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    // Check that progress dots are rendered
    const progressDots = screen
      .getByText("Step 3 of 5")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(progressDots).toHaveLength(5);
  });

  it("should show progress indicators on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    // Check that progress dots are rendered
    const progressDots = screen
      .getByText("Step 2 of 5")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(progressDots).toHaveLength(5);
  });

  it("should call unified step detection hook", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(mockUseStepDetection).toHaveBeenCalled();
  });

  it("should pass correct props to unified step detection hook", () => {
    const completeStep = jest.fn();
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep,
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<OnboardingGuide />);

    expect(mockUseStepDetection).toHaveBeenCalledWith({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      onStepComplete: expect.any(Function),
    });
  });

  describe("Import Results", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should show success message with import results when import completes", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      mockUseCmdPaletteGuide.mockReturnValue({
        currentStep: null,
        isGuideActive: false,
        completeStep: jest.fn(),
        skipGuide: jest.fn(),
        completeGuide: jest.fn(),
      });

      render(<OnboardingGuide />, {
        state: {
          sync: {
            importGCal: {
              importing: false,
              importResults: { eventsCount: 10, calendarsCount: 2 },
              pendingLocalEventsSynced: null,
              awaitingImportResults: false,
              importError: null,
            },
          },
        },
      });

      expect(screen.getByText("Welcome to Compass")).toBeInTheDocument();
      expect(
        screen.getByText("Imported 10 events from 2 calendars"),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Step \d+ of \d+/)).not.toBeInTheDocument();
    });

    it("should show import results with local events synced", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      mockUseCmdPaletteGuide.mockReturnValue({
        currentStep: null,
        isGuideActive: false,
        completeStep: jest.fn(),
        skipGuide: jest.fn(),
        completeGuide: jest.fn(),
      });

      render(<OnboardingGuide />, {
        state: {
          sync: {
            importGCal: {
              importing: false,
              importResults: {
                eventsCount: 5,
                calendarsCount: 1,
                localEventsSynced: 3,
              },
              pendingLocalEventsSynced: null,
              awaitingImportResults: false,
              importError: null,
            },
          },
        },
      });

      expect(
        screen.getByText("Imported 5 events from 1 calendar"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("3 local events synced to the cloud"),
      ).toBeInTheDocument();
    });

    it("should auto-dismiss after 8 seconds", async () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      mockUseCmdPaletteGuide.mockReturnValue({
        currentStep: null,
        isGuideActive: false,
        completeStep: jest.fn(),
        skipGuide: jest.fn(),
        completeGuide: jest.fn(),
      });

      render(<OnboardingGuide />, {
        state: {
          sync: {
            importGCal: {
              importing: false,
              importResults: { eventsCount: 10, calendarsCount: 2 },
              pendingLocalEventsSynced: null,
              awaitingImportResults: false,
              importError: null,
            },
          },
        },
      });

      expect(
        screen.getByText("Imported 10 events from 2 calendars"),
      ).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(8000);
      });

      // After auto-dismiss, the success message should no longer be visible
      expect(
        screen.queryByText("Imported 10 events from 2 calendars"),
      ).not.toBeInTheDocument();
    });

    it("should clear auto-dismiss timer on unmount", async () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      mockUseCmdPaletteGuide.mockReturnValue({
        currentStep: null,
        isGuideActive: false,
        completeStep: jest.fn(),
        skipGuide: jest.fn(),
        completeGuide: jest.fn(),
      });

      const { unmount } = render(<OnboardingGuide />, {
        state: {
          sync: {
            importGCal: {
              importing: false,
              importResults: { eventsCount: 10, calendarsCount: 2 },
              pendingLocalEventsSynced: null,
              awaitingImportResults: false,
              importError: null,
            },
          },
        },
      });

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
      unmount();

      // Advancing timers after unmount should not cause any errors
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
    });

    it("should dismiss import results when skip button is clicked", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const skipGuide = jest.fn();
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      mockUseCmdPaletteGuide.mockReturnValue({
        currentStep: null,
        isGuideActive: false,
        completeStep: jest.fn(),
        skipGuide,
        completeGuide: jest.fn(),
      });

      render(<OnboardingGuide />, {
        state: {
          sync: {
            importGCal: {
              importing: false,
              importResults: { eventsCount: 10, calendarsCount: 2 },
              pendingLocalEventsSynced: null,
              awaitingImportResults: false,
              importError: null,
            },
          },
        },
      });

      expect(
        screen.getByText("Imported 10 events from 2 calendars"),
      ).toBeInTheDocument();

      const dismissButton = screen.getByLabelText("Dismiss");
      await user.click(dismissButton);

      expect(skipGuide).not.toHaveBeenCalled();
      expect(
        screen.queryByText("Imported 10 events from 2 calendars"),
      ).not.toBeInTheDocument();
    });
  });
});
