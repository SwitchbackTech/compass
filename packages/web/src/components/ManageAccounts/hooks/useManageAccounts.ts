import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface ManageAccountsContextValue {
  isOpen: boolean;
  closeManageAccounts: () => void;
  openManageAccounts: () => void;
}

const defaultContextValue: ManageAccountsContextValue = {
  isOpen: false,
  closeManageAccounts: () => {},
  openManageAccounts: () => {},
};

export const ManageAccountsContext =
  createContext<ManageAccountsContextValue>(defaultContextValue);

export function useManageAccounts(): ManageAccountsContextValue {
  return useContext(ManageAccountsContext);
}

export function useManageAccountsState(): ManageAccountsContextValue {
  const [isOpen, setIsOpen] = useState(false);

  const openManageAccounts = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeManageAccounts = useCallback(() => {
    setIsOpen(false);
  }, []);

  return useMemo(
    () => ({ isOpen, closeManageAccounts, openManageAccounts }),
    [isOpen, closeManageAccounts, openManageAccounts],
  );
}
