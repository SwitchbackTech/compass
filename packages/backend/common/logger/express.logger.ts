import * as winston from "winston";
import * as expressWinston from "express-winston";

import { isDev } from "../helpers/common.helpers";
import { MB_50 } from "../constants/common";

const configExpressLogger = () => {
  const loggerOptions: expressWinston.LoggerOptions = {
    meta: false,
    transports: [
      new winston.transports.File({
        filename: "logs/http-error.log",
        level: "error",
        maxFiles: 1,
      }),
      new winston.transports.File({
        filename: "logs/http-combined.log",
        level: process.env.LOG_LEVEL,
        maxsize: MB_50,
        maxFiles: 2,
      }),
      new winston.transports.Console({ level: process.env.LOG_LEVEL }),
    ],
    format: winston.format.combine(
      winston.format.json(),
      winston.format.prettyPrint(),
      winston.format.colorize({ all: true })
    ),
  };

  if (!isDev()) {
    loggerOptions.meta = false;
    if (typeof global.it === "function") {
      // not sure if this should be changed
      loggerOptions.level = "http"; // for non-debug test runs, squelch entirely
    }
  }
  return loggerOptions;
};

const expressLogOptions = configExpressLogger();
const expressLogger = expressWinston.logger(expressLogOptions);
export default expressLogger;
