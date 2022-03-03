"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const tslib_1 = require("tslib");
const core_constants_1 = require("@core/core.constants");
const winston = (0, tslib_1.__importStar)(require("winston"));
const consoleFormat = winston.format.combine(
  winston.format.splat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: "YY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, namespace, level, message } = info,
      meta = (0, tslib_1.__rest)(info, [
        "timestamp",
        "namespace",
        "level",
        "message",
      ]);
    const _namespace = namespace || "";
    const _timestamp = timestamp || "";
    return `${_timestamp} [${level}] ${_namespace}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
    }`;
  })
);
const transports = () => {
  const fileTransport = new winston.transports.File({
    filename: "logs/app.log",
    level: process.env["LOG_LEVEL"],
    maxsize: core_constants_1.MB_50,
    maxFiles: 1,
  });
  const consoleTransport = new winston.transports.Console({
    format: consoleFormat,
  });
  return [fileTransport, consoleTransport];
};
const parentLogger = winston.createLogger({
  level: process.env["LOG_LEVEL"],
  transports: transports(),
});
const Logger = (namespace) => {
  // child logger that allows including namespace metadata
  if (namespace) {
    return parentLogger.child({ namespace });
  }
  return parentLogger;
};
exports.Logger = Logger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luc3Rvbi5sb2dnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9sb2dnZXIvd2luc3Rvbi5sb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHlEQUE2QztBQUU3Qyw4REFBbUM7QUFFbkMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQzFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQ3RCLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQ3pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLENBQUMsRUFDekQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUF1QixFQUFFLEVBQUU7SUFDaEQsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sS0FBYyxJQUFJLEVBQWIsSUFBSSx1QkFBSyxJQUFJLEVBQXhELDhDQUFpRCxDQUFPLENBQUM7SUFDL0QsTUFBTSxVQUFVLEdBQUcsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFXLENBQUM7SUFDL0MsTUFBTSxVQUFVLEdBQUcsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFXLENBQUM7SUFDL0MsT0FBTyxHQUFHLFVBQVUsS0FBSyxLQUFLLEtBQUssVUFBVSxLQUFLLE9BQU8sSUFDdkQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDN0QsRUFBRSxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtJQUN0QixNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ2hELFFBQVEsRUFBRSxjQUFjO1FBQ3hCLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUMvQixPQUFPLEVBQUUsc0JBQUs7UUFDZCxRQUFRLEVBQUUsQ0FBQztLQUNaLENBQUMsQ0FBQztJQUNILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztRQUN0RCxNQUFNLEVBQUUsYUFBYTtLQUN0QixDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDO0FBRUYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztJQUN4QyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUM7SUFDL0IsVUFBVSxFQUFFLFVBQVUsRUFBRTtDQUN6QixDQUFDLENBQUM7QUFFSSxNQUFNLE1BQU0sR0FBRyxDQUFDLFNBQWtCLEVBQUUsRUFBRTtJQUMzQyx3REFBd0Q7SUFDeEQsSUFBSSxTQUFTLEVBQUU7UUFDYixPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO0tBQzFDO0lBQ0QsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQyxDQUFDO0FBTlcsUUFBQSxNQUFNLFVBTWpCIn0=
