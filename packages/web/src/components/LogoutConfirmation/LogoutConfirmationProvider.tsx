import { type PropsWithChildren, useCallback } from "react";
import { useLogout } from "@web/auth/compass/hooks/useLogout";
import {
  LogoutConfirmationContext,
  useLogoutConfirmationState,
} from "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation";
import { LogoutConfirmationDialog } from "@web/components/LogoutConfirmation/LogoutConfirmationDialog";

export function LogoutConfirmationProvider({ children }: PropsWithChildren) {
  const logout = useLogout();
  const value = useLogoutConfirmationState();
  const { closeLogoutConfirmation, isOpen } = value;

  const handleConfirm = useCallback(() => {
    closeLogoutConfirmation();
    logout();
  }, [closeLogoutConfirmation, logout]);

  return (
    <LogoutConfirmationContext.Provider value={value}>
      {children}
      <LogoutConfirmationDialog
        isOpen={isOpen}
        onCancel={closeLogoutConfirmation}
        onConfirm={handleConfirm}
      />
    </LogoutConfirmationContext.Provider>
  );
}
