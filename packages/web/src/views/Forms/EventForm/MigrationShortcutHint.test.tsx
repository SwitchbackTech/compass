import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import {
  mockLinuxUserAgent,
  mockMacOSUserAgent,
  mockWindowsUserAgent,
} from "@web/__tests__/__mocks__/mock.setup";
import { MigrationShortcutHint } from "./MigrationShortcutHint";

describe.each([
  {
    os: "Windows",
    mockUserAgent: mockWindowsUserAgent,
    expectedModifierTestId: "control-icon",
  },
  {
    os: "Linux",
    mockUserAgent: mockLinuxUserAgent,
    expectedModifierTestId: "control-icon",
  },
  {
    os: "MacOS",
    mockUserAgent: mockMacOSUserAgent,
    expectedModifierTestId: "meta-icon",
  },
])(
  "MigrationShortcutHint - $os",
  ({ mockUserAgent, expectedModifierTestId }) => {
    beforeEach(() => {
      mockUserAgent();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it("renders the platform modifier icon", () => {
      render(
        <MigrationShortcutHint>
          <span data-testid="arrow-icon">Arrow</span>
        </MigrationShortcutHint>,
      );

      expect(screen.getByTestId(expectedModifierTestId)).toBeInTheDocument();
      expect(screen.getByTestId("arrow-icon")).toBeInTheDocument();
    });
  },
);
