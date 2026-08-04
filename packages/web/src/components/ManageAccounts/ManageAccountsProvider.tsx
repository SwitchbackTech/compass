import { type PropsWithChildren } from "react";
import {
  ManageAccountsContext,
  useManageAccountsState,
} from "@web/components/ManageAccounts/hooks/useManageAccounts";
import { ManageAccountsDialog } from "@web/components/ManageAccounts/ManageAccountsDialog";

export function ManageAccountsProvider({ children }: PropsWithChildren) {
  const value = useManageAccountsState();

  return (
    <ManageAccountsContext.Provider value={value}>
      {children}
      <ManageAccountsDialog
        isOpen={value.isOpen}
        onDismiss={value.closeManageAccounts}
      />
    </ManageAccountsContext.Provider>
  );
}
