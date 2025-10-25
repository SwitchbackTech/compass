import { usePostHog } from "posthog-js/react";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { getUserEmail, getUserId } from "./auth.util";

const UserContext = createContext<
  { isLoadingUser: boolean; userId: string } | undefined
>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const posthog = usePostHog();

  useLayoutEffect(() => {
    const fetchUserData = async () => {
      try {
        const uid = await getUserId();
        const userEmail = await getUserEmail();
        setUserId(uid);
        setEmail(userEmail);
      } catch (e) {
        console.error("Failed to get user because:", e);
      } finally {
        setIsLoadingUser(false);
      }
    };

    void fetchUserData();
  }, []);

  // Identify user in PostHog when userId and email are available
  useEffect(() => {
    if (userId && email && posthog) {
      posthog.identify(email, { email, userId });
    }
  }, [userId, email, posthog]);

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
