import { io } from "socket.io-client";
import { FETCH_USER_METADATA } from "@core/constants/websocket.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";

export const socket = io(ENV_WEB.BACKEND_BASEURL, {
  withCredentials: true,
  autoConnect: false,
  reconnection: false,
  closeOnBeforeunload: true,
  transports: ["websocket", "polling"],
});

export const disconnect = () => {
  socket.disconnect();
};

export const reconnect = () => {
  disconnect();

  const timeout = setTimeout(() => {
    socket.connect();
    clearTimeout(timeout);
  }, 1000);
};

const onError = (error: unknown) => {
  console.error("Socket error:", error);
};

export const onceConnected = () => {
  socket.emit(FETCH_USER_METADATA);
};

socket.once("connect", onceConnected);
socket.on("error", onError);
