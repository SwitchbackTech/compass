// sort-imports-ignore
import * as http from "http";
import { logger } from "./init";
// eslint-disable-next-line prettier/prettier
import { ENV } from "./common/constants/env.constants";
import mongoService from "./common/services/mongo.service";
import { initExpressServer } from "./servers/express/express.server";
import { webSocketServer } from "./servers/websocket/websocket.server";

mongoService;

const app = initExpressServer();
const httpServer: http.Server = http.createServer(app);
webSocketServer.init(httpServer);

httpServer.listen(ENV.PORT, () => {
  logger.info(`Server running on port: ${ENV.PORT}`);
});
