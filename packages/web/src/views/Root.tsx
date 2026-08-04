import { useMemo } from "react";
import { useIsBackendUnavailable } from "@web/api/util/backend-unavailable-error.util";
import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { UserProvider } from "@web/auth/compass/user/context/UserProvider";
import { isMobileOS } from "@web/common/utils/device/device.util";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import { GlobalShortcutsHost } from "@web/components/CompassProvider/CompassProvider";
import { MobileGate } from "@web/components/MobileGate/MobileGate";
import { UpNextBanner } from "@web/components/Sidebar/UpNextCard/UpNextBanner";
import SSEProvider from "@web/sse/provider/SSEProvider";
import { BackendDownView } from "@web/views/BackendDown/BackendDown";

export const RootView = () => {
  // Gate on the device OS, not the window width: narrow desktop windows get
  // the responsive layout. Static per session, so no listener is needed.
  const isMobile = useMemo(() => isMobileOS(), []);
  const isBackendUnavailable = useIsBackendUnavailable();

  if (isMobile) {
    return <MobileGate />;
  }

  // Never-authenticated users read/write local IndexedDB, so a missing backend
  // is expected (frontend-only dev, UI-only self-hosted deploys) and the app
  // still works. Only gate users whose events actually live on the backend.
  if (isBackendUnavailable && hasUserEverAuthenticated()) {
    return <BackendDownView />;
  }

  return (
    <UserProvider>
      <SSEProvider>
        <GlobalShortcutsHost />
        <UpNextBanner />
        <AuthenticatedLayout />
      </SSEProvider>
    </UserProvider>
  );
};
