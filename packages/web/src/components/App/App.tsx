import React from "react";
import {
  CompassOptionalProviders,
  CompassRequiredProviders,
} from "@web/components/CompassProvider/CompassProvider";
import { ErrorBoundary } from "@web/components/ErrorBoundary";
import { CompassRouterProvider } from "@web/routers";

export const App = () => {
  return (
    <React.StrictMode>
      {/* PostHog wraps the boundary so a caught error can still be reported;
          the boundary wraps everything else so a render throw in any provider,
          the router, or a view renders the recovery surface instead of a blank
          page. */}
      <CompassOptionalProviders>
        <ErrorBoundary>
          <CompassRequiredProviders>
            <CompassRouterProvider />
          </CompassRequiredProviders>
        </ErrorBoundary>
      </CompassOptionalProviders>
    </React.StrictMode>
  );
};
