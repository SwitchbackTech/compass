import { ReactNode } from "react";
import { useDispatch } from "react-redux";
import { Socket, io } from "socket.io-client";
import {
  EVENT_CHANGED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
} from "@core/constants/websocket.constants";
import { ServerToClientEvents } from "@core/types/websocket.types";
import { useUser } from "@web/auth/UserContext";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";

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

  socket.on(IMPORT_GCAL_START, () => {
    dispatch(importGCalSlice.actions.request(undefined));
    dispatch(importGCalSlice.actions.importing(true));
  });

  socket.on(IMPORT_GCAL_END, () => {
    dispatch(importGCalSlice.actions.importing(false));
  });

  return children;
};

export default SocketProvider;
