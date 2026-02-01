import { useEffect } from "react";
import { useUser } from "@web/auth/hooks/user/useUser";
import { socket } from "../client/socket.client";

export const useSocketConnection = () => {
  const { userId } = useUser();

  useEffect(() => {
    if (userId && !socket.connected) {
      socket.connect();
    } else if (!userId && socket.connected) {
      socket.disconnect();
    }
  }, [userId]);
};
