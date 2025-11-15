import cors from "cors";
import { PORT_DEFAULT_WEB } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { ENV } from "@backend/common/constants/env.constants";

const logger = Logger("app:frontegg.middleware");

interface FronteggConfig {
  clientId: string;
  apiKey: string;
  baseUrl: string;
}

let fronteggConfig: FronteggConfig | null = null;

export const initFrontegg = () => {
  // Check if Frontegg is configured
  if (!ENV.FRONTEGG_CLIENT_ID || !ENV.FRONTEGG_API_KEY) {
    logger.warn(
      "Frontegg not configured. Skipping Frontegg initialization. Set FRONTEGG_CLIENT_ID and FRONTEGG_API_KEY to enable Frontegg.",
    );
    return;
  }

  try {
    // Initialize Frontegg configuration
    fronteggConfig = {
      clientId: ENV.FRONTEGG_CLIENT_ID,
      apiKey: ENV.FRONTEGG_API_KEY,
      baseUrl: ENV.FRONTEGG_BASE_URL || "https://api.frontegg.com",
    };

    logger.info("Frontegg initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize Frontegg:", error);
    throw error;
  }
};

export const getFronteggConfig = (): FronteggConfig => {
  if (!fronteggConfig) {
    throw new Error(
      "Frontegg config not initialized. Call initFrontegg() first.",
    );
  }
  return fronteggConfig;
};

export const fronteggCors = () =>
  cors({
    origin: `http://localhost:${PORT_DEFAULT_WEB}`,
    allowedHeaders: [
      "content-type",
      "authorization",
      "frontegg-tenant-id",
      "frontegg-user-id",
    ],
    credentials: true,
  });
