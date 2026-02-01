import { ReactNode } from "react";
import { useEventSync } from "../hooks/useEventSync";
import { useGcalSync } from "../hooks/useGcalSync";
import { useSocketConnection } from "../hooks/useSocketConnection";

export * from "../client/socket.client";

const SocketProvider = ({ children }: { children: ReactNode }) => {
  useSocketConnection();
  useEventSync();
  useGcalSync();

  return children;
};

export default SocketProvider;
