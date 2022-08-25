import cors from "cors";
import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import {
  APP_NAME,
  PORT_DEFAULT_API,
  PORT_DEFAULT_WEB,
} from "@core/constants/core.constants";
import { ENV, IS_DEV } from "@backend/common/constants/env.constants";

export const initSupertokens = () => {
  supertokens.init({
    appInfo: {
      appName: APP_NAME,
      apiDomain: `http://localhost:${PORT_DEFAULT_API}`,
      websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
      apiBasePath: "/api",
    },
    supertokens: {
      connectionURI: IS_DEV
        ? ENV.SUPERTOKENS_DEV_URI
        : ENV.SUPERTOKENS_PROD_URI,
      apiKey: IS_DEV ? ENV.SUPERTOKENS_DEV_KEY : ENV.SUPERTOKENS_PROD_KEY,
    },
    framework: "express",
    recipeList: [Session.init()],
  });
};

export const supertokensCors = () =>
  cors({
    origin: `http://localhost:${PORT_DEFAULT_WEB}`,
    allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
    credentials: true,
  });

initSupertokens();
// renaming for readability
export {
  errorHandler as supertokensErrorHandler,
  middleware as supertokensMiddleware,
} from "supertokens-node/framework/express";
