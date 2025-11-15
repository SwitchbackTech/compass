import React from "react";
import { FronteggProvider as FronteggReactProvider } from "@frontegg/react";
import { ENV_WEB } from "@web/common/constants/env.constants";

interface FronteggProviderProps {
  children: React.ReactNode;
}

/**
 * Frontegg POC Provider
 * This wraps the application with Frontegg authentication context
 * Only enabled when FRONTEGG_BASE_URL and FRONTEGG_CLIENT_ID are configured
 */
export const FronteggProvider: React.FC<FronteggProviderProps> = ({
  children,
}) => {
  // Check if Frontegg is configured
  const isFronteggConfigured =
    ENV_WEB.FRONTEGG_BASE_URL && ENV_WEB.FRONTEGG_CLIENT_ID;

  if (!isFronteggConfigured) {
    // If Frontegg is not configured, just render children without the provider
    return <>{children}</>;
  }

  const fronteggConfig = {
    baseUrl: ENV_WEB.FRONTEGG_BASE_URL!,
    clientId: ENV_WEB.FRONTEGG_CLIENT_ID!,
    appId: ENV_WEB.FRONTEGG_CLIENT_ID!, // Some Frontegg setups use appId instead of clientId
  };

  return (
    <FronteggReactProvider
      contextOptions={fronteggConfig}
      hostedLoginBox={true}
      // Configure session management
      authOptions={{
        keepSessionAlive: true, // Enable session refresh
      }}
    >
      {children}
    </FronteggReactProvider>
  );
};
