import * as http from "http";
import { Logger } from "@core/logger/winston.logger";
import "./bootstrap";
import { ENV } from "./common/constants/env.constants";
import mongoService from "./common/services/mongo.service";
import { initExpressServer } from "./servers/express/express.server";
import { webSocketServer } from "./servers/websocket/websocket.server";

const logger = Logger("app:root");
mongoService;

const app = initExpressServer();
const httpServer: http.Server = http.createServer(app);
webSocketServer.init(httpServer);

const port = ENV.PORT;
httpServer.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});
