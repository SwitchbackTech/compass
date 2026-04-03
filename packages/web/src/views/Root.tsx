import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { UserProvider } from "@web/auth/compass/user/context/UserProvider";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import { GlobalShortcutsHost } from "@web/components/CompassProvider/CompassProvider";
import { MobileGate } from "@web/components/MobileGate/MobileGate";
import { EditModeProvider } from "@web/hotkeys/providers/EditModeProvider";
import SSEProvider from "@web/sse/provider/SSEProvider";

const RootViewContent = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { clearEditMode } = useEditMode();

  useEffect(() => {
    if (location.pathname !== ROOT_ROUTES.NOW) {
      clearEditMode();
    }
  }, [clearEditMode, location.pathname]);

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

export const RootView = () => (
  <EditModeProvider>
    <RootViewContent />
  </EditModeProvider>
);
