import { SessionContext } from "@web/auth/compass/session/SessionProvider";
import { useContext } from "react";

export const useSession = () => useContext(SessionContext);
