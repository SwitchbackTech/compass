import { type ReactNode } from "react";
import { useEventSSE } from "../hooks/useEventSSE";
import { useGcalSSE } from "../hooks/useGcalSSE";
import { useSSEConnection } from "../hooks/useSSEConnection";
import { useSyncFocusRefresh } from "../hooks/useSyncFocusRefresh";
import { useTransientSyncPolling } from "../hooks/useTransientSyncPolling";

export * from "../client/sse.client";

const SSEProvider = ({ children }: { children: ReactNode }) => {
  useSSEConnection();
  useEventSSE();
  useGcalSSE();
  useSyncFocusRefresh();
  useTransientSyncPolling();

  return children;
};

export default SSEProvider;
