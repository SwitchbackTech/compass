import { useAuth, useLoginWithRedirect } from "@frontegg/react";

/**
 * Frontegg authentication utilities
 * These mirror the SuperTokens utilities for easy comparison
 */

/**
 * Hook to get Frontegg authentication state
 */
export const useFronteggAuth = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const loginWithRedirect = useLoginWithRedirect();

  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginWithRedirect,
    userId: user?.id || null,
    email: user?.email || null,
    tenantId: user?.tenantId || null,
  };
};

/**
 * Get the user ID from Frontegg session
 * This mirrors the SuperTokens getUserId function
 */
export const getFronteggUserId = (): string | null => {
  // This requires the Frontegg context, so it should be called within a component
  // For non-component usage, you'd need to use the Frontegg SDK directly
  const userStr = localStorage.getItem("frontegg-user");
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return user.id || null;
  } catch {
    return null;
  }
};

/**
 * Get the user's email from Frontegg session
 */
export const getFronteggUserEmail = (): string | null => {
  const userStr = localStorage.getItem("frontegg-user");
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return user.email || null;
  } catch {
    return null;
  }
};

/**
 * Check if Frontegg is configured
 */
export const isFronteggConfigured = (): boolean => {
  return !!(
    process.env["FRONTEGG_BASE_URL"] && process.env["FRONTEGG_CLIENT_ID"]
  );
};
