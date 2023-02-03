import morgan from "morgan";
import { IncomingMessage, ServerResponse } from "http";
import chalk from "chalk";

const get = (
  key: string,
  tokens: morgan.TokenIndexer<IncomingMessage, ServerResponse<IncomingMessage>>,
  req?: IncomingMessage,
  res?: ServerResponse<IncomingMessage>
) => {
  if (tokens[key] === undefined) return "unknown";
  if (req && res) {
    //@ts-ignore
    if (tokens[key](req, res) === undefined) {
      return "unknown";
    }
    //@ts-ignore
    const val = tokens[key](req, res) as string;
    return val;
  }
  if (!tokens[key]) {
    return "unknown";
  }
  return tokens[key];
};

const getStatusColor = (status: string) => {
  let statusColor: string;
  switch (status[0]) {
    case "1":
    case "2": {
      return "#BDCFDC";
    }
    case "3": {
      return "#BCB55D";
    }
    case "4":
    case "5": {
      return "#EE4B2B";
    }
    default: {
      return "#F97CFA";
    }
  }
  return statusColor;
};

export const httpLoggingMiddleware = morgan(function (tokens, req, res) {
  const responseTime =
    get("response-time", tokens, req, res)?.toString() || "unknown";

  const status = get("status", tokens, req, res) as string;
  const statusColor = getStatusColor(status);

  return [
    chalk.hex(statusColor).bold(status),
    chalk.hex("#F3F2ED").bold(get("method", tokens, req, res)),
    chalk.hex("#6CD7E9").bold(get("url", tokens, req, res)),
    chalk.hex("#5A7ED9").bold(responseTime + "ms"),
    chalk.hex("#fba9fc").bold(get("date", tokens, req, res)),
  ].join(" ");
});
