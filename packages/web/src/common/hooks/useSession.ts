import { useContext } from "react";
import { SessionContext } from "@web/auth/session/SessionProvider";

export const useSession = () => useContext(SessionContext);
