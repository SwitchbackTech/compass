import { ReactNode } from "react";
import { useNavigation } from "react-router-dom";
import { useSession } from "@web/common/hooks/useSession";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { state } = useNavigation();
  const session = useSession();

  if (state === "loading" || session.loading) return <AbsoluteOverflowLoader />;

  if (!session.authenticated) return null;

  return <>{children}</>;
};
