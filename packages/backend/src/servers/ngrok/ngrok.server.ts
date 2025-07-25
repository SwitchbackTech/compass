import EventEmitter from "node:events";
import type { Server } from "node:http";
import type { Server as HttpsServer } from "node:https";
import type { Listener } from "@ngrok/ngrok";
import { isDev } from "@core/util/env.util";
import { ENV } from "@backend/common/constants/env.constants";
import { getServerUri } from "@backend/servers/websocket/websocket.util";

interface NGrokEventsMap {
  connect: [];
  connected: [Listener];
  error: [Error];
  close: [];
}

export function initNgrokServer(
  httpServer: Server | HttpsServer,
): EventEmitter<NGrokEventsMap> | undefined {
  const devMode = isDev(ENV.NODE_ENV);
  const envVars = [ENV.NGROK_AUTHTOKEN, ENV.NGROK_DOMAIN];
  const [authtoken, domain] = envVars;
  const envDefined = envVars.every((value) => (value?.length ?? 0) > 0);

  if (!devMode || !envDefined) return;

  const listener = new EventEmitter<NGrokEventsMap>({
    captureRejections: true,
  });

  listener.on("connect", async () => {
    try {
      const ngrok = await import("@ngrok/ngrok").catch(() => undefined);
      const addr = getServerUri(httpServer);

      const server = await ngrok?.connect({
        addr,
        authtoken_from_env: true,
        authtoken,
        compression: true,
        name: "Compass",
        domain,
      });

      if (server) listener.emit("connected", server);
    } catch (error) {
      listener.emit("error", error as Error);
    }
  });

  return listener;
}
