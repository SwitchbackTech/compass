import { useEffect } from "react";
import { useSession } from "@web/auth/session/useSession";
import { useUser } from "@web/auth/user/hooks/useUser";
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
