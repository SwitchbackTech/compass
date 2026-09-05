import { encryptCredentialConnectPayload } from "@core/security/internal-credential-envelope";
import {
  ConnectionCredentialBrowserRequestSchema,
  type ConnectionCredentialRequest,
  ConnectionCredentialRequestSchema,
  ConnectionCredentialSubmitRequestSchema,
} from "@core/types/sync/connection.contracts";
import { CONFIG } from "@backend/common/constants/config.constants";

export function sealCredentialConnectRequest(
  tenantId: string,
  principalId: string,
  body: unknown,
): ConnectionCredentialRequest {
  const parsed = ConnectionCredentialSubmitRequestSchema.parse(body);
  if ("envelope" in parsed) {
    return ConnectionCredentialRequestSchema.parse(parsed);
  }

  const browser = ConnectionCredentialBrowserRequestSchema.parse(parsed);
  const secret = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;
  if (!secret) {
    throw new Error("Sync internal auth token is not configured");
  }

  return {
    provider: "apple",
    envelope: encryptCredentialConnectPayload(
      secret,
      { username: browser.username, secret: browser.secret },
      { tenantId, principalId, provider: "apple" },
    ),
  };
}
