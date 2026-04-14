import { type UserProfile } from "@core/types/user.types";
import { createContext } from "react";

export const UserContext = createContext<
  Partial<{ userId: string } & Omit<UserProfile, "_id">> | undefined
>(undefined);
