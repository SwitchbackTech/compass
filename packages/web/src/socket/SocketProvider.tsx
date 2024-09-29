import { ReactNode } from "react";
import { useDispatch } from "react-redux";
import { io, Socket } from "socket.io-client";
import { ServerToClientEvents } from "@core/types/websocket.types";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { useUser } from "@web/auth/UserContext";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();
  const { userId } = useUser();

  const socket: Socket<ServerToClientEvents> = io(ENV_WEB.BACKEND_BASEURL, {
    withCredentials: true,
    query: {
      userId,
    },
  });

  socket.on("connect_error", (err) => {
    console.log("connect_error:", err);
  });

  socket.on("disconnect", (reason) => {
    console.log("disconnected, cuz:", reason);
  });

  socket.on(EVENT_CHANGED, () => {
    dispatch(triggerFetch());
  });

  return children;
};

export default SocketProvider;
