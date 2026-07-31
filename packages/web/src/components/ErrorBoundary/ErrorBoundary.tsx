import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";
import { SomethingBrokeView } from "@web/components/ErrorBoundary/SomethingBrokeView";

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level React error boundary.
 *
 * Before this existed, a render-phase throw anywhere in the tree unmounted the
 * whole app and left a blank, unrecoverable page - and, because PostHog's
 * exception handlers only cover async/global errors (not render errors), it did
 * so with zero telemetry (see session 019fb57e). This boundary turns that into
 * a visible recovery surface and reports the caught error to PostHog so the
 * crash is no longer invisible.
 *
 * Reporting uses the PostHog singleton rather than a hook so the class can call
 * it directly; it is a no-op when PostHog is disabled.
 */
export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    getPosthogClient()?.captureException(error, {
      $exception_handled: false,
      $exception_source: "react-error-boundary",
      componentStack: errorInfo.componentStack,
    });
    // Keep a console record for local dev / when PostHog is disabled.
    console.error("Uncaught render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <SomethingBrokeView />;
    }

    return this.props.children;
  }
}
