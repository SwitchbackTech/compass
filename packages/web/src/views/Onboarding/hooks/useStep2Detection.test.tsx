import React from "react";
import { MemoryRouter } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { markStepCompleted } from "../utils/onboardingStorage.util";
import { useStep2Detection } from "./useStep2Detection";

describe("useStep2Detection", () => {
  it("should detect navigation to /now route when on step 2", () => {
    const onStepComplete = jest.fn();

    renderHook(
      () =>
        useStep2Detection({
          currentStep: 2,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[ROOT_ROUTES.NOW]}>
            {children}
          </MemoryRouter>
        ),
      },
    );

    expect(onStepComplete).toHaveBeenCalledTimes(1);
  });

  it("should not detect navigation when not on step 2", () => {
    const onStepComplete = jest.fn();

    renderHook(
      () =>
        useStep2Detection({
          currentStep: 1,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[ROOT_ROUTES.NOW]}>
            {children}
          </MemoryRouter>
        ),
      },
    );

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it("should not detect navigation when on step 3", () => {
    const onStepComplete = jest.fn();

    renderHook(
      () =>
        useStep2Detection({
          currentStep: 3,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[ROOT_ROUTES.NOW]}>
            {children}
          </MemoryRouter>
        ),
      },
    );

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it("should detect navigation when step changes to 2 and route is /now", () => {
    const onStepComplete = jest.fn();

    const { rerender } = renderHook(
      ({ currentStep }) =>
        useStep2Detection({
          currentStep,
          onStepComplete,
        }),
      {
        initialProps: { currentStep: 1 },
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[ROOT_ROUTES.NOW]}>
            {children}
          </MemoryRouter>
        ),
      },
    );

    expect(onStepComplete).not.toHaveBeenCalled();

    // Change to step 2 while already on /now route
    rerender({ currentStep: 2 });

    expect(onStepComplete).toHaveBeenCalledTimes(1);
  });

  it("should not detect navigation when route is not /now", () => {
    const onStepComplete = jest.fn();

    renderHook(
      () =>
        useStep2Detection({
          currentStep: 2,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[ROOT_ROUTES.DAY]}>
            {children}
          </MemoryRouter>
        ),
      },
    );

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it("should skip detection if step 2 is already completed", () => {
    const onStepComplete = jest.fn();

    // Mark step 2 as completed
    markStepCompleted(2);

    renderHook(
      () =>
        useStep2Detection({
          currentStep: 2,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[ROOT_ROUTES.NOW]}>
            {children}
          </MemoryRouter>
        ),
      },
    );

    expect(onStepComplete).not.toHaveBeenCalled();
  });
});
