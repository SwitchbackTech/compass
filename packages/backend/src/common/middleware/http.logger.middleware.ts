import { styleText } from "node:util";
import { type IncomingMessage, type ServerResponse } from "http";
import morgan from "morgan";

type HttpLogColor = "cyanBright" | "yellow" | "red" | "magentaBright";

const get = (
  key: string,
  tokens: morgan.TokenIndexer<IncomingMessage, ServerResponse<IncomingMessage>>,
  req?: IncomingMessage,
  res?: ServerResponse<IncomingMessage>,
): string => {
  const token = tokens[key];
  if (token === undefined) {
    return "unknown";
  }
  if (req && res) {
    if (typeof token === "function") {
      const val = token(req, res);
      return val === undefined ? "unknown" : String(val);
    }
    return String(token);
  }
  return "unknown";
};

const getStatusColor = (status: string): HttpLogColor => {
  switch (status[0]) {
    case "1":
    case "2": {
      return "cyanBright";
    }
    case "3": {
      return "yellow";
    }
    case "4":
    case "5": {
      return "red";
    }
    default: {
      return "magentaBright";
    }
  }
};

export const httpLoggingMiddleware = morgan((tokens, req, res) => {
  const responseTime =
    get("response-time", tokens, req, res)?.toString() || "unknown";

  const status = get("status", tokens, req, res);
  const statusColor = getStatusColor(status);

  return [
    styleText(["bold", statusColor], status),
    styleText(["bold", "whiteBright"], get("method", tokens, req, res)),
    styleText(["bold", "cyanBright"], get("url", tokens, req, res)),
    styleText(["bold", "blueBright"], responseTime + "ms"),
    styleText(["bold", "magentaBright"], get("date", tokens, req, res)),
  ].join(" ");
});
