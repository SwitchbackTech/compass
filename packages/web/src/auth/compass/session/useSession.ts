import { useContext } from "react";
import { SessionContext } from "@web/auth/compass/session/SessionProvider";

export const useSession = () => useContext(SessionContext);
