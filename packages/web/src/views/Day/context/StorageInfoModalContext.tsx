import { createContext, useCallback, useContext, useState } from "react";

interface StorageInfoModalContextValue {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const StorageInfoModalContext = createContext<
  StorageInfoModalContextValue | undefined
>(undefined);

export const useStorageInfoModal = () => {
  const context = useContext(StorageInfoModalContext);
  if (!context) {
    throw new Error(
      "useStorageInfoModal must be used within StorageInfoModalProvider",
    );
  }
  return context;
};

interface StorageInfoModalProviderProps {
  children: React.ReactNode;
}

export const StorageInfoModalProvider = ({
  children,
}: StorageInfoModalProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <StorageInfoModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </StorageInfoModalContext.Provider>
  );
};
