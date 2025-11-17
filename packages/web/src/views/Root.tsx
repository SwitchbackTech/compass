import { UserProvider } from "@web/auth/UserProvider";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import SocketProvider from "@web/socket/SocketProvider";

export const RootView = () => {
  return (
    <UserProvider>
      <SocketProvider>
        <AuthenticatedLayout />
      </SocketProvider>
    </UserProvider>
  );
};
