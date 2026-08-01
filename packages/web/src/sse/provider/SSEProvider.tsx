import { type ReactNode } from "react";
import { useEventSSE } from "../hooks/useEventSSE";
import { useGcalSSE } from "../hooks/useGcalSSE";
import { useSSEConnection } from "../hooks/useSSEConnection";
import { useSyncFocusRefresh } from "../hooks/useSyncFocusRefresh";

export * from "../client/sse.client";

const SSEProvider = ({ children }: { children: ReactNode }) => {
  useSSEConnection();
  useEventSSE();
  useGcalSSE();
  useSyncFocusRefresh();

  return children;
};

export default SSEProvider;
