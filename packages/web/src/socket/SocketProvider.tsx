import { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { ServerToClientEvents } from "@core/types/websocket.types";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { useUser } from "@web/auth/UserContext";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { eventChanged } from "@web/ducks/events/slices/sync.slice";
import { useDispatch } from "react-redux";

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { userId } = useUser();
  const dispatch = useDispatch();

  const socket: Socket<ServerToClientEvents> = io(ENV_WEB.BACKEND_BASEURL, {
    withCredentials: true,
    query: {
      userId,
    },
  });

  socket.on("connect", () => {
    console.log(`connected to server with userId: ${userId}`);
    console.log(socket);
  });

  socket.on(EVENT_CHANGED, (data) => {
    console.log("event changed:", data);
    dispatch(
      eventChanged({ startDate: data.startDate, endDate: data.endDate })
    );
  });

  return children;
};

export default SocketProvider;
