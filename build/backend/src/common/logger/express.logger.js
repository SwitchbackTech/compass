"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const winston = (0, tslib_1.__importStar)(require("winston"));
const expressWinston = (0, tslib_1.__importStar)(require("express-winston"));
const core_constants_1 = require("@core/core.constants");
const common_helpers_1 = require("../helpers/common.helpers");
const configExpressLogger = () => {
  const loggerOptions = {
    meta: false,
    transports: [
      new winston.transports.File({
        filename: "logs/http-error.log",
        level: "error",
        maxFiles: 1,
      }),
      new winston.transports.File({
        filename: "logs/http-combined.log",
        level: process.env["LOG_LEVEL"],
        maxsize: core_constants_1.MB_50,
        maxFiles: 2,
      }),
      new winston.transports.Console({ level: process.env["LOG_LEVEL"] }),
    ],
    format: winston.format.combine(
      winston.format.json(),
      winston.format.prettyPrint(),
      winston.format.colorize({ all: true })
    ),
  };
  if (!(0, common_helpers_1.isDev)()) {
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
exports.default = expressLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzcy5sb2dnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9jb21tb24vbG9nZ2VyL2V4cHJlc3MubG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUFtQztBQUNuQyw2RUFBa0Q7QUFDbEQseURBQTZDO0FBRTdDLDhEQUFrRDtBQUVsRCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsRUFBRTtJQUMvQixNQUFNLGFBQWEsR0FBaUM7UUFDbEQsSUFBSSxFQUFFLEtBQUs7UUFDWCxVQUFVLEVBQUU7WUFDVixJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO2dCQUMxQixRQUFRLEVBQUUscUJBQXFCO2dCQUMvQixLQUFLLEVBQUUsT0FBTztnQkFDZCxRQUFRLEVBQUUsQ0FBQzthQUNaLENBQUM7WUFDRixJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO2dCQUMxQixRQUFRLEVBQUUsd0JBQXdCO2dCQUNsQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUM7Z0JBQy9CLE9BQU8sRUFBRSxzQkFBSztnQkFDZCxRQUFRLEVBQUUsQ0FBQzthQUNaLENBQUM7WUFDRixJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztTQUNwRTtRQUNELE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDdkM7S0FDRixDQUFDO0lBRUYsSUFBSSxDQUFDLElBQUEsc0JBQUssR0FBRSxFQUFFO1FBQ1osYUFBYSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDM0IsSUFBSSxPQUFPLE1BQU0sQ0FBQyxFQUFFLEtBQUssVUFBVSxFQUFFO1lBQ25DLHFDQUFxQztZQUNyQyxhQUFhLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLDRDQUE0QztTQUMzRTtLQUNGO0lBQ0QsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxpQkFBaUIsR0FBRyxtQkFBbUIsRUFBRSxDQUFDO0FBQ2hELE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMvRCxrQkFBZSxhQUFhLENBQUMifQ==
