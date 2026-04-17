import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
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
    expectedMetaKeyTestId: "windows-icon",
  },
  {
    os: "Linux",
    mockUserAgent: mockLinuxUserAgent,
    expectedMetaKeyTestId: "linux-icon",
  },
  {
    os: "MacOS",
    mockUserAgent: mockMacOSUserAgent,
    expectedMetaKeyTestId: "mac-icon",
  },
])("MigrationShortcutHint - $os", ({
  mockUserAgent,
  expectedMetaKeyTestId,
}) => {
  beforeEach(() => {
    mockUserAgent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Ctrl+Meta migration chord", () => {
    render(
      <MigrationShortcutHint>
        <span data-testid="arrow-icon">Arrow</span>
      </MigrationShortcutHint>,
    );

    expect(screen.getByText("CTRL")).toBeInTheDocument();
    expect(screen.getByTestId(expectedMetaKeyTestId)).toBeInTheDocument();
    expect(screen.getByTestId("arrow-icon")).toBeInTheDocument();
  });
});
