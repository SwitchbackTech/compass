import { useEffect } from "react";
import { useUser } from "@web/auth/hooks/user/useUser";
import { closeStream, openStream } from "../client/sse.client";

export const useSSEConnection = () => {
  const { userId } = useUser();

  useEffect(() => {
    if (userId) {
      openStream();
    } else {
      closeStream();
    }
  }, [userId]);
};
