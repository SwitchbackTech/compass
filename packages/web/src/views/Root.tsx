import { UserProvider } from "@web/auth/context/UserProvider";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import SocketProvider from "@web/socket/provider/SocketProvider";

export const RootView = () => {
  return (
    <UserProvider>
      <SocketProvider>
        <AuthenticatedLayout />
      </SocketProvider>
    </UserProvider>
  );
};
