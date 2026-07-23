import { type AnyRouter } from "@tanstack/react-router";
import { screen, waitFor } from "@testing-library/react";
import { expect } from "bun:test";

/**
 * TanStack's RouterProvider resolves the initial match asynchronously (even
 * with no loaders). Wait until the router is idle before querying the DOM.
 */
export async function waitForRouterIdle(router: AnyRouter): Promise<void> {
  await waitFor(() => {
    expect(router.state.status).toBe("idle");
  });
}

/**
 * AuthModal open state is URL-driven (`?auth=`). Wait for a visible heading
 * before querying backdrop/presentation or form fields.
 */
export async function waitForAuthModal(
  heading: RegExp | string = /hey, welcome back/i,
): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  });
}
