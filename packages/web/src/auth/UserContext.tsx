import React, {
  createContext,
  ReactNode,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

import { getUserId } from "./auth.util";

const UserContext = createContext<
  { isLoadingUser: boolean; userId: string } | undefined
>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  useLayoutEffect(() => {
    const fetchUserId = async () => {
      try {
        const uid = await getUserId();
        setUserId(uid);
      } catch (e) {
        console.log("Failed to get user because:", e);
      } finally {
        setIsLoadingUser(false);
      }
    };

    void fetchUserId();
  }, []);

  if (isLoadingUser || userId === null) {
    return <AbsoluteOverflowLoader />;
  }

  return (
    <UserContext.Provider value={{ userId, isLoadingUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};
