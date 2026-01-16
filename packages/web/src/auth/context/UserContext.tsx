import { createContext } from "react";
import { UserProfile } from "@core/types/user.types";

export const UserContext = createContext<
  | Partial<
      { isLoadingUser: boolean; userId: string } & Omit<UserProfile, "_id">
    >
  | undefined
>(undefined);
