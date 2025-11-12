import { ReactNode } from "react";
import { useNavigation } from "react-router-dom";
import { useSession } from "@web/common/hooks/useSession";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { state } = useNavigation();
  const { authenticated } = useSession();

  if (!authenticated) return null;

  if (state === "loading") return <AbsoluteOverflowLoader />;

  return <>{children}</>;
};
