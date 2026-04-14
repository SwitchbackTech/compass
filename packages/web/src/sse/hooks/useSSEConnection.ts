import { useSession } from "@web/auth/compass/session/useSession";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useEffect } from "react";
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
