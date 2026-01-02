import { useLocation } from "react-router-dom";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { useSession } from "@web/common/hooks/useSession";
import {
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStep1Detection } from "../hooks/useStep1Detection";
import { useStep2Detection } from "../hooks/useStep2Detection";
import { useStep3Detection } from "../hooks/useStep3Detection";
import { useStep4Detection } from "../hooks/useStep4Detection";
import { markStepCompleted } from "../utils/onboardingStorage.util";
import { CmdPaletteGuide } from "./CmdPaletteGuide";

// Mock the hooks before importing the component
jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
}));
jest.mock("@web/common/hooks/useSession");
jest.mock("../hooks/useCmdPaletteGuide");
jest.mock("../hooks/useStep1Detection");
jest.mock("../hooks/useStep2Detection");
jest.mock("../hooks/useStep3Detection");
jest.mock("../hooks/useStep4Detection");
jest.mock("@web/common/utils/storage/storage.util", () => ({
  getDateKey: jest.fn(() => "2024-01-01"),
  loadTasksFromStorage: jest.fn(() => []),
}));

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseCmdPaletteGuide = useCmdPaletteGuide as jest.MockedFunction<
  typeof useCmdPaletteGuide
>;
const mockUseStep1Detection = useStep1Detection as jest.MockedFunction<
  typeof useStep1Detection
>;
const mockUseStep2Detection = useStep2Detection as jest.MockedFunction<
  typeof useStep2Detection
>;
const mockUseStep3Detection = useStep3Detection as jest.MockedFunction<
  typeof useStep3Detection
>;
const mockUseStep4Detection = useStep4Detection as jest.MockedFunction<
  typeof useStep4Detection
>;

const mockGetDateKey = getDateKey as jest.MockedFunction<typeof getDateKey>;
const mockLoadTasksFromStorage = loadTasksFromStorage as jest.MockedFunction<
  typeof loadTasksFromStorage
>;

describe("CmdPaletteGuide", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseStep1Detection.mockImplementation(() => {});
    mockUseStep2Detection.mockImplementation(() => {});
    mockUseStep3Detection.mockImplementation(() => {});
    mockUseStep4Detection.mockImplementation(() => {});
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

    const { container } = render(<CmdPaletteGuide />);

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
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(screen.getByText(/Type.*to create a task/i)).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument(); // The kbd element
    expect(screen.getByLabelText("Skip guide")).toBeInTheDocument();
  });

  it("should render step 1 on Now view when on step 1", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    // Step 1 should show on any view if not completed
    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(screen.getByText(/Type.*to create a task/i)).toBeInTheDocument();
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
    markStepCompleted(1); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(/Press.*to go to the \/now view/i),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // The kbd element
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
  });

  it("should show step 1 instructions on Now view when step 1 is not completed", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    // Should show step 1 instructions instead since step 1 wasn't completed
    // Step 1 shows on any view if not completed
    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(screen.getByText(/Type.*to create a task/i)).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
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
    markStepCompleted(1); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(
      screen.getByText(/Press.*to go to the \/now view/i),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // The kbd element
  });

  it("should show step 1 instructions on Day view when step 1 is not completed", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockLoadTasksFromStorage.mockReturnValue([]); // Step 1 not completed
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    // Should show step 1 instructions instead since step 1 wasn't completed
    expect(screen.getByText("Welcome to the Day View")).toBeInTheDocument();
    expect(screen.getByText(/Type.*to create a task/i)).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("should render step 3 instructions on Now view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 3,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(/Press.*to edit the description/i),
    ).toBeInTheDocument();
    expect(screen.getByText("d")).toBeInTheDocument(); // The kbd element
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
  });

  it("should render step 4 instructions on Now view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
    markStepCompleted(1);
    markStepCompleted(2);
    markStepCompleted(3);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 4,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Welcome to the Now View")).toBeInTheDocument();
    expect(
      screen.getByText(/Press.*to edit the reminder/i),
    ).toBeInTheDocument();
    expect(screen.getByText("r")).toBeInTheDocument(); // The kbd element
    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
  });

  it("should not render step 3 on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 3,
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
      currentStep: 1,
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
      currentStep: 1,
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
    markStepCompleted(1); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
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
    markStepCompleted(1); // Mark step 1 as completed in onboarding progress
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    // Check that progress dots are rendered
    const progressDots = screen
      .getByText("Step 2 of 4")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(progressDots).toHaveLength(4);
  });

  it("should show progress indicators on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    // Check that progress dots are rendered
    const progressDots = screen
      .getByText("Step 1 of 4")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(progressDots).toHaveLength(4);
  });

  it("should not render step 4 on Day view", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 4,
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

  it("should call all step detection hooks", () => {
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(mockUseStep1Detection).toHaveBeenCalled();
    expect(mockUseStep2Detection).toHaveBeenCalled();
    expect(mockUseStep3Detection).toHaveBeenCalled();
    expect(mockUseStep4Detection).toHaveBeenCalled();
  });

  it("should pass correct props to step detection hooks", () => {
    const completeStep = jest.fn();
    mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep,
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide />);

    expect(mockUseStep1Detection).toHaveBeenCalledWith({
      currentStep: 1,
      onStepComplete: expect.any(Function),
    });

    expect(mockUseStep2Detection).toHaveBeenCalledWith({
      currentStep: 1,
      onStepComplete: expect.any(Function),
    });

    expect(mockUseStep3Detection).toHaveBeenCalledWith({
      currentStep: 1,
      onStepComplete: expect.any(Function),
    });

    expect(mockUseStep4Detection).toHaveBeenCalledWith({
      currentStep: 1,
      onStepComplete: expect.any(Function),
    });
  });
});
