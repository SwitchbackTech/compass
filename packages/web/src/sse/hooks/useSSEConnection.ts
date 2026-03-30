import { useEffect } from "react";
import { useSession } from "@web/auth/hooks/session/useSession";
import { useUser } from "@web/auth/hooks/user/useUser";
import { closeStream, openStream } from "../client/sse.client";

export const useSSEConnection = () => {
  const { authenticated } = useSession();
  const { userId } = useUser();

  useEffect(() => {
    if (authenticated || userId) {
      openStream();
    } else {
      closeStream();
    }
  }, [authenticated, userId]);
};
