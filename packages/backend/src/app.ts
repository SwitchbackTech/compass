import path from "path";
import moduleAlias from "module-alias";
moduleAlias.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});
import dotenv from "dotenv";
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}
import express from "express";
import * as http from "http";
import helmet from "helmet";
import corsWhitelist from "@backend/common/middleware/cors.middleware";
import cors from "cors";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import supertokens from "supertokens-node";
import { errorHandler, middleware } from "supertokens-node/framework/express";
import Session from "supertokens-node/recipe/session";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { AuthRoutes } from "@backend/auth/auth.routes.config";
import { EventRoutes } from "@backend/event/event.routes.config";
import { PriorityRoutes } from "@backend/priority/priority.routes.config";
import { SyncRoutes } from "@backend/sync/sync.routes.config";
import { CalendarRoutes } from "@backend/calendar/calendar.routes.config";
import { ENV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";
import expressLogger from "@backend/common/logger/express.logger";
import { Logger } from "@core/logger/winston.logger";
import {
  catchSyncErrors,
  promiseMiddleware,
} from "@backend/common/middleware/promise.middleware";

/* Misc Configuration */
const logger = Logger("app:root");
mongoService;

/* Supertokens */
supertokens.init({
  framework: "express",
  supertokens: {
    //move to .ENV
    connectionURI:
      "***REMOVED***",
    apiKey: "***REMOVED***",
  },
  appInfo: {
    // learn more about this on https://supertokens.com/docs/session/appinfo
    appName: "Compass Calendar",
    apiDomain: "http://localhost:9080",
    websiteDomain: "http://localhost:9080",
    apiBasePath: "/api/auth",
    websiteBasePath: "/auth",
  },
  recipeList: [Session.init()],
});

/* Express Configuration */
const app: express.Application = express();
// initialize middleware before routes, because
// some routes depend on them
//@ts-ignore
app.use(promiseMiddleware());

/* supertokens middleware */
app.use(
  cors({
    origin: "http://localhost:9080",
    allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
    credentials: true,
  })
);
app.use(middleware());

app.use(corsWhitelist);
app.use(helmet());
app.use(expressLogger);
app.use(express.json());
// app.use(catchUndefinedSyncErrors);
app.use(catchSyncErrors); // might need to move down

const routes: Array<CommonRoutesConfig> = [];
routes.push(new AuthRoutes(app));
routes.push(new PriorityRoutes(app));
routes.push(new EventRoutes(app));
routes.push(new SyncRoutes(app));
routes.push(new CalendarRoutes(app));

// use logout() if possible
app.post(
  "/api/auth/logout",
  verifySession(),
  async (req: SessionRequest, res) => {
    // This will delete the session from the db and from the frontend (cookies)
    const user = req.session?.getUserId();
    await req.session!.revokeSession();

    res.send(`Success! session revoked for ${user}`);
  }
);
app.post("/api/auth/login", async (req: express.Request, res) => {
  // verify user's credentials...

  const userId = "userId2"; // get from db

  await Session.createNewSession(res, userId);

  /* a new session has been created.
   * - an access & refresh token has been attached to the response's cookie
   * - a new row has been inserted into the database for this new session
   */

  res.json({ message: "User logged in!" });
});
app.post("/api/super/post", verifySession(), (req: SessionRequest, res) => {
  const userId = req.session!.getUserId();
  res.json({ user: userId });
});

// Add this AFTER all your routes
app.use(errorHandler());

/* Express Start */
const server: http.Server = http.createServer(app);
const port = ENV.PORT;
server.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});
