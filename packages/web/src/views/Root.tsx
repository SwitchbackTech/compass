import { UserProvider } from "@web/auth/context/UserProvider";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import { MobileGate } from "@web/components/MobileGate/MobileGate";
import SocketProvider from "@web/socket/provider/SocketProvider";

export const RootView = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileGate />;
  }

  return (
    <UserProvider>
      <SocketProvider>
        <AuthenticatedLayout />
      </SocketProvider>
    </UserProvider>
  );
};
