import "@testing-library/jest-dom";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStep1Detection } from "../hooks/useStep1Detection";
import { useStep2Detection } from "../hooks/useStep2Detection";
import { useStep3Detection } from "../hooks/useStep3Detection";
import { CmdPaletteGuide } from "./CmdPaletteGuide";

// Mock the hooks before importing the component
jest.mock("../hooks/useCmdPaletteGuide");
jest.mock("../hooks/useStep1Detection");
jest.mock("../hooks/useStep2Detection");
jest.mock("../hooks/useStep3Detection");

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

describe("CmdPaletteGuide", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseStep1Detection.mockImplementation(() => {});
    mockUseStep2Detection.mockImplementation(() => {});
    mockUseStep3Detection.mockImplementation(() => {});
  });

  it("should not render when guide is not active", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: null,
      isGuideActive: false,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { container } = render(
      <CmdPaletteGuide showOnDayView={true} showOnNowView={false} />,
    );

    expect(
      container.querySelector('[class*="fixed inset-0"]'),
    ).not.toBeInTheDocument();
  });

  it("should render step 1 instructions on Day view", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide showOnDayView={true} showOnNowView={false} />);

    expect(screen.getByText("Command Palette Guide")).toBeInTheDocument();
    expect(screen.getByText("Press 'c' to create a task")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Skip guide")).toBeInTheDocument();
  });

  it("should not render step 1 on Now view", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { container } = render(
      <CmdPaletteGuide showOnDayView={false} showOnNowView={true} />,
    );

    expect(
      container.querySelector('[class*="fixed inset-0"]'),
    ).not.toBeInTheDocument();
  });

  it("should render step 2 instructions on Now view", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide showOnDayView={false} showOnNowView={true} />);

    expect(screen.getByText("Command Palette Guide")).toBeInTheDocument();
    expect(
      screen.getByText("Press '1' to go to the /now view"),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("should not render step 2 on Day view", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { container } = render(
      <CmdPaletteGuide showOnDayView={true} showOnNowView={false} />,
    );

    expect(
      container.querySelector('[class*="fixed inset-0"]'),
    ).not.toBeInTheDocument();
  });

  it("should render step 3 instructions on Now view", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 3,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide showOnDayView={false} showOnNowView={true} />);

    expect(screen.getByText("Command Palette Guide")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Click the description area or press 'd' to customize your note-to-self",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
  });

  it("should call skipGuide when skip button is clicked", () => {
    const skipGuide = jest.fn();
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide,
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide showOnDayView={true} showOnNowView={false} />);

    const skipButton = screen.getByLabelText("Skip guide");
    skipButton.click();

    expect(skipGuide).toHaveBeenCalledTimes(1);
  });

  it("should show progress indicators correctly", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide showOnDayView={false} showOnNowView={true} />);

    // Check that progress dots are rendered
    const progressDots = screen
      .getByText("Step 2 of 3")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(progressDots).toHaveLength(3);
  });

  it("should call all step detection hooks", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep: jest.fn(),
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide showOnDayView={true} showOnNowView={false} />);

    expect(mockUseStep1Detection).toHaveBeenCalled();
    expect(mockUseStep2Detection).toHaveBeenCalled();
    expect(mockUseStep3Detection).toHaveBeenCalled();
  });

  it("should pass correct props to step detection hooks", () => {
    const completeStep = jest.fn();
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
      isGuideActive: true,
      completeStep,
      skipGuide: jest.fn(),
      completeGuide: jest.fn(),
    });

    render(<CmdPaletteGuide showOnDayView={true} showOnNowView={false} />);

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
  });
});
