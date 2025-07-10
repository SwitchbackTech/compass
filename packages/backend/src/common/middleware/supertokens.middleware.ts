import cors from "cors";
import SuperTokens from "supertokens-node";
import Dashboard from "supertokens-node/recipe/dashboard";
import {
  default as Session,
  SessionContainer,
} from "supertokens-node/recipe/session";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import {
  APP_NAME,
  PORT_DEFAULT_BACKEND,
  PORT_DEFAULT_WEB,
} from "@core/constants/core.constants";
import { ENV } from "@backend/common/constants/env.constants";
import { SupertokensAccessTokenPayload } from "@backend/common/types/supertokens.types";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";

export const initSupertokens = () => {
  SuperTokens.init({
    appInfo: {
      appName: APP_NAME,
      apiBasePath: "/api",
      apiDomain: `http://localhost:${PORT_DEFAULT_BACKEND}`,
      websiteBasePath: "/login",
      websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
    },
    supertokens: {
      connectionURI: ENV.SUPERTOKENS_URI,
      apiKey: ENV.SUPERTOKENS_KEY,
    },
    framework: "express",
    recipeList: [
      Dashboard.init(),
      Session.init({
        override: {
          apis(originalImplementation) {
            return {
              ...originalImplementation,
              async signOutPOST(input) {
                const data: SupertokensAccessTokenPayload =
                  input.session.getAccessTokenPayload();

                const socketId = data.sessionHandle;

                return originalImplementation.signOutPOST!(input).then(
                  (res) => {
                    webSocketServer.handleUserSignOut(socketId!);

                    return res;
                  },
                );
              },
              async refreshPOST(input) {
                return originalImplementation.refreshPOST!(input).then(
                  async (session: SessionContainer) => {
                    const data: SupertokensAccessTokenPayload =
                      session.getAccessTokenPayload();

                    const socketId = data.sessionHandle;

                    webSocketServer.handleUserRefreshToken(socketId!);

                    return session;
                  },
                );
              },
            };
          },
        },
      }),
      UserMetadata.init(),
    ],
  });
};

export const supertokensCors = () =>
  cors({
    origin: `http://localhost:${PORT_DEFAULT_WEB}`,
    allowedHeaders: [
      "content-type",
      "st-auth-mode",
      ...SuperTokens.getAllCORSHeaders(),
    ],
    credentials: true,
  });
