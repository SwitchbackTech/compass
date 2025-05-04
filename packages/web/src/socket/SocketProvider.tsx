import { ReactNode } from "react";
import { useDispatch } from "react-redux";
import { Socket, io } from "socket.io-client";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { ServerToClientEvents } from "@core/types/websocket.types";
import { useUser } from "@web/auth/UserContext";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
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
    console.error("connect_error:", err);
  });

  socket.on("disconnect", (reason) => {
    console.log("disconnected due to:", reason);
  });

  socket.on(EVENT_CHANGED, () => {
    dispatch(
      triggerFetch({
        reason: Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED,
      }),
    );
  });

  return children;
};

export default SocketProvider;
