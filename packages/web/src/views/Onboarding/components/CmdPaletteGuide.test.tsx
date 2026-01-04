import { useLocation } from "react-router-dom";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { useSession } from "@web/common/hooks/useSession";
import {
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStepDetection } from "../hooks/useStepDetection";
import { markStepCompleted } from "../utils/onboarding.storage.util";
import { CmdPaletteGuide } from "./CmdPaletteGuide";

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
jest.mock("@web/common/hooks/useSession");
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
    mockUseSession.mockReturnValue({ authenticated: false });
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

    render(<CmdPaletteGuide />);

    expect(screen.queryByText("Welcome to Compass")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Day View"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Now View"),
    ).not.toBeInTheDocument();
  });

  it("should render step 1 instructions on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // No tasks yet
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

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
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent ===
            "Press 2 to go to the Day view, then type c to create a task" ??
          false,
      ),
    ).toBeInTheDocument();
  });

  it("should render step 2 instructions on Now view when step 1 is completed", () => {
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
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 1 to go to the /now view" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // The kbd element
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
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

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent ===
            "Press 2 to go to the Day view, then type c to create a task" ??
          false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("should render step 1 instructions on Week view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Week View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent ===
            "Press 2 to go to the Day view, then type c to create a task" ??
          false,
      ),
    ).toBeInTheDocument();
  });

  it("should render step 2 instructions on Week view", () => {
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
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Week View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 1 to go to the /now view" ?? false,
      ),
    ).toBeInTheDocument();
  });

  it("should render step 2 instructions on Day view when step 1 is completed", () => {
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
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press 1 to go to the /now view" ?? false,
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

    render(<CmdPaletteGuide />);

    // Should show step 1 instructions instead since step 1 wasn't completed
    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Type c to create a task" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("should render step 3 instructions on Now view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press d to edit the description" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("d")).toBeInTheDocument(); // The kbd element
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
  });

  it("should render step 4 instructions on Now view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    markStepCompleted(ONBOARDING_STEPS.EDIT_DESCRIPTION);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.EDIT_REMINDER,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Press r to edit the reminder" ?? false,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("r")).toBeInTheDocument(); // The kbd element
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
  });

  it("should not render step 3 on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.queryByText("Welcome to Compass")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Day View"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Now View"),
    ).not.toBeInTheDocument();
  });

  it("should not render on Day view when authenticated", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseSession.mockReturnValue({ authenticated: true });
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.queryByText("Welcome to Compass")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Day View"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Now View"),
    ).not.toBeInTheDocument();
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

    render(<CmdPaletteGuide />);

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
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide,
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

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
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    // Check that progress dots are rendered
    const progressDots = screen
      .getByText("Step 2 of 5")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(progressDots).toHaveLength(5);
  });

  it("should show progress indicators on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    // Check that progress dots are rendered
    const progressDots = screen
      .getByText("Step 1 of 5")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(progressDots).toHaveLength(5);
  });

  it("should not render step 4 on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.EDIT_REMINDER,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.queryByText("Welcome to Compass")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Day View"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Welcome to the Now View"),
    ).not.toBeInTheDocument();
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

    render(<CmdPaletteGuide />);

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

    render(<CmdPaletteGuide />);

    expect(mockUseStepDetection).toHaveBeenCalledWith({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      onStepComplete: expect.any(Function),
    });
  });
});
