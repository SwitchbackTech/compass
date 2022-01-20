"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston = __importStar(require("winston"));
const backend_constants_1 = require("../constants/backend.constants");
const consoleFormat = winston.format.combine(winston.format.splat(), winston.format.colorize(), winston.format.timestamp({ format: "YY-MM-DD HH:mm:ss" }), winston.format.printf((info) => {
    const { timestamp, namespace, level, message } = info, meta = __rest(info, ["timestamp", "namespace", "level", "message"]);
    const _namespace = namespace ? `${namespace}` : "";
    return `${timestamp} [${level}] ${_namespace}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`;
}));
const transports = () => {
    const fileTransport = new winston.transports.File({
        filename: "logs/app.log",
        level: process.env.LOG_LEVEL,
        maxsize: backend_constants_1.MB_50,
        maxFiles: 1,
    });
    const consoleTransport = new winston.transports.Console({
        format: consoleFormat,
    });
    return [fileTransport, consoleTransport];
};
const parentLogger = winston.createLogger({
    level: process.env.LOG_LEVEL,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmxvZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9jb21tb24vbG9nZ2VyL2NvbW1vbi5sb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLHNFQUF1RDtBQUV2RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDMUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFDdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFDekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxFQUN6RCxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO0lBQzdCLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEtBQWMsSUFBSSxFQUFiLElBQUksVUFBSyxJQUFJLEVBQXhELDhDQUFpRCxDQUFPLENBQUM7SUFDL0QsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDbkQsT0FBTyxHQUFHLFNBQVMsS0FBSyxLQUFLLEtBQUssVUFBVSxLQUFLLE9BQU8sSUFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDN0QsRUFBRSxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtJQUN0QixNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ2hELFFBQVEsRUFBRSxjQUFjO1FBQ3hCLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVM7UUFDNUIsT0FBTyxFQUFFLHlCQUFLO1FBQ2QsUUFBUSxFQUFFLENBQUM7S0FDWixDQUFDLENBQUM7SUFDSCxNQUFNLGdCQUFnQixHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7UUFDdEQsTUFBTSxFQUFFLGFBQWE7S0FDdEIsQ0FBQyxDQUFDO0lBRUgsT0FBTyxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQztBQUVGLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7SUFDeEMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUztJQUM1QixVQUFVLEVBQUUsVUFBVSxFQUFFO0NBQ3pCLENBQUMsQ0FBQztBQUVJLE1BQU0sTUFBTSxHQUFHLENBQUMsU0FBa0IsRUFBRSxFQUFFO0lBQzNDLHdEQUF3RDtJQUN4RCxJQUFJLFNBQVMsRUFBRTtRQUNiLE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7S0FDMUM7SUFDRCxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDLENBQUM7QUFOVyxRQUFBLE1BQU0sVUFNakIifQ==