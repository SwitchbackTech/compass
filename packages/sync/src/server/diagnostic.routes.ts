import { type Express, type RequestHandler } from "express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { DiagnosticConnectionResponseSchema } from "@core/types/sync/diagnostic.contracts";
import { resolveDiagnosticConnection } from "@sync/domain/connection-diagnostic.service";
import { redactedCause } from "@sync/safety/redact-error";
import {
  ensureConnected,
  internalRateLimit,
  requireAuth,
  respondInternalError,
} from "@sync/server/internal-http";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";
import { syncRepositories } from "@sync/storage/sync-repositories";

const logger = Logger("sync:diagnostic.routes");

export const DIAGNOSTIC_CONNECTION_PATH =
  "/internal/diagnostics/connections/:diagnosticKey";

export interface DiagnosticApiDeps {
  authMiddleware: RequestHandler;
  mongo: SyncMongoService;
}

// Private support lookup. Auth proves the caller holds INTERNAL_AUTH_TOKEN
// (same as every internal route); the diagnostic key is resolved globally
// because operators do not know the tenant/principal from logs alone.
export function registerDiagnosticRoutes(
  app: Express,
  deps: DiagnosticApiDeps,
): void {
  app.get(
    DIAGNOSTIC_CONNECTION_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      const diagnosticKey = String(req.params["diagnosticKey"] ?? "");
      if (!/^[0-9a-f]{32}$/.test(diagnosticKey)) {
        res
          .status(Status.BAD_REQUEST)
          .json({ error: "invalid_diagnostic_key" });
        return;
      }

      try {
        const result = await resolveDiagnosticConnection(
          syncRepositories(deps.mongo),
          diagnosticKey,
        );
        if (!result) {
          res.status(Status.NOT_FOUND).json({ error: "not_found" });
          return;
        }
        res
          .status(Status.OK)
          .json(DiagnosticConnectionResponseSchema.parse(result));
      } catch (error) {
        logger.error(
          "Failed to resolve diagnostic connection",
          redactedCause(error),
        );
        respondInternalError(res);
      }
    },
  );
}
