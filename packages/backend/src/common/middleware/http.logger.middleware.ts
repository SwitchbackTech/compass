import { type IncomingMessage, type ServerResponse } from "http";
import morgan from "morgan";
import { styleText } from "node:util";

type HttpLogColor = "cyanBright" | "yellow" | "red" | "magentaBright";

const get = (
  key: string,
  tokens: morgan.TokenIndexer<IncomingMessage, ServerResponse<IncomingMessage>>,
  req?: IncomingMessage,
  res?: ServerResponse<IncomingMessage>,
) => {
  if (tokens[key] === undefined) return "unknown";
  if (req && res) {
    // @ts-expect-error morgan token indexer typing does not preserve the token call signature.
    if (tokens[key](req, res) === undefined) {
      return "unknown";
    }
    // @ts-expect-error morgan token indexer typing does not preserve the token call signature.
    const val = tokens[key](req, res) as string;
    return val;
  }
  if (!tokens[key]) {
    return "unknown";
  }
  return tokens[key];
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

export const httpLoggingMiddleware = morgan(function (tokens, req, res) {
  const responseTime =
    get("response-time", tokens, req, res)?.toString() || "unknown";

  const status = get("status", tokens, req, res) as string;
  const statusColor = getStatusColor(status);

  return [
    styleText(["bold", statusColor], status),
    styleText(["bold", "whiteBright"], get("method", tokens, req, res)),
    styleText(["bold", "cyanBright"], get("url", tokens, req, res)),
    styleText(["bold", "blueBright"], responseTime + "ms"),
    styleText(["bold", "magentaBright"], get("date", tokens, req, res)),
  ].join(" ");
});
