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
Object.defineProperty(exports, "__esModule", { value: true });
const winston = __importStar(require("winston"));
const expressWinston = __importStar(require("express-winston"));
const common_helpers_1 = require("../helpers/common.helpers");
const backend_constants_1 = require("../constants/backend.constants");
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
                level: process.env.LOG_LEVEL,
                maxsize: backend_constants_1.MB_50,
                maxFiles: 2,
            }),
            new winston.transports.Console({ level: process.env.LOG_LEVEL }),
        ],
        format: winston.format.combine(winston.format.json(), winston.format.prettyPrint(), winston.format.colorize({ all: true })),
    };
    if (!common_helpers_1.isDev()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzcy5sb2dnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY29tbW9uL2xvZ2dlci9leHByZXNzLmxvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsZ0VBQWtEO0FBRWxELDhEQUFrRDtBQUNsRCxzRUFBdUQ7QUFFdkQsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLEVBQUU7SUFDL0IsTUFBTSxhQUFhLEdBQWlDO1FBQ2xELElBQUksRUFBRSxLQUFLO1FBQ1gsVUFBVSxFQUFFO1lBQ1YsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFDMUIsUUFBUSxFQUFFLHFCQUFxQjtnQkFDL0IsS0FBSyxFQUFFLE9BQU87Z0JBQ2QsUUFBUSxFQUFFLENBQUM7YUFDWixDQUFDO1lBQ0YsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFDMUIsUUFBUSxFQUFFLHdCQUF3QjtnQkFDbEMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUztnQkFDNUIsT0FBTyxFQUFFLHlCQUFLO2dCQUNkLFFBQVEsRUFBRSxDQUFDO2FBQ1osQ0FBQztZQUNGLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNqRTtRQUNELE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDdkM7S0FDRixDQUFDO0lBRUYsSUFBSSxDQUFDLHNCQUFLLEVBQUUsRUFBRTtRQUNaLGFBQWEsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQzNCLElBQUksT0FBTyxNQUFNLENBQUMsRUFBRSxLQUFLLFVBQVUsRUFBRTtZQUNuQyxxQ0FBcUM7WUFDckMsYUFBYSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyw0Q0FBNEM7U0FDM0U7S0FDRjtJQUNELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUMsQ0FBQztBQUVGLE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztBQUNoRCxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDL0Qsa0JBQWUsYUFBYSxDQUFDIn0=