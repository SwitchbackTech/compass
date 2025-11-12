import { useContext } from "react";
import { SessionContext } from "@web/auth/SessionProvider";

export const useSession = () => useContext(SessionContext);
