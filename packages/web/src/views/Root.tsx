import { UserProvider } from "@web/auth/compass/user/context/UserProvider";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import { GlobalShortcutsHost } from "@web/components/CompassProvider/CompassProvider";
import { MobileGate } from "@web/components/MobileGate/MobileGate";
import SSEProvider from "@web/sse/provider/SSEProvider";

const RootViewContent = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileGate />;
  }

  return (
    <UserProvider>
      <SSEProvider>
        <GlobalShortcutsHost />
        <AuthenticatedLayout />
      </SSEProvider>
    </UserProvider>
  );
};

export const RootView = () => <RootViewContent />;
