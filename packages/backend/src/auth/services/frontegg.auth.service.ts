import { Logger } from "@core/logger/winston.logger";
import { getFronteggConfig } from "@backend/common/middleware/frontegg.middleware";

const logger = Logger("app:frontegg.auth.service");

interface FronteggUser {
  id: string;
  email: string;
  name?: string;
  tenantId: string;
  tenantIds: string[];
  roles: string[];
  permissions: string[];
}

class FronteggAuthService {
  /**
   * Validate a Frontegg access token
   * @param accessToken The JWT access token to validate
   * @returns The decoded user information if valid
   *
   * NOTE: This is a simplified POC implementation.
   * In production, you would:
   * 1. Verify the JWT signature using Frontegg's public key
   * 2. Validate the token expiration
   * 3. Check token claims (iss, aud, etc.)
   * 4. Make API calls to Frontegg to get full user details if needed
   */
  async validateAccessToken(accessToken: string): Promise<FronteggUser | null> {
    try {
      const config = getFronteggConfig();

      // POC: In a real implementation, you would:
      // 1. Decode the JWT
      // 2. Verify signature with Frontegg's public key
      // 3. Make API call to Frontegg if needed
      //
      // For now, we'll validate that the token exists and log it
      if (!accessToken || accessToken.length < 10) {
        return null;
      }

      logger.debug(`Validating Frontegg token with config: ${config.clientId}`);

      // POC: Return a mock user for demonstration
      // In production, decode the JWT and/or call Frontegg API
      return {
        id: "frontegg-user-id",
        email: "user@example.com",
        name: "Frontegg User",
        tenantId: "tenant-id",
        tenantIds: ["tenant-id"],
        roles: ["user"],
        permissions: [],
      };
    } catch (error) {
      logger.error("Failed to validate access token:", error);
      return null;
    }
  }

  /**
   * Revoke all sessions for a user
   * @param userId The user ID to revoke sessions for
   *
   * NOTE: This is a POC implementation.
   * In production, you would call Frontegg's API to revoke tokens
   */
  async revokeUserSessions(userId: string): Promise<{ revoked: number }> {
    try {
      const config = getFronteggConfig();

      logger.info(
        `POC: Revoking sessions for user ${userId} with config: ${config.clientId}`,
      );

      // POC: In production, make API call to Frontegg
      // Example: POST to {baseUrl}/identity/resources/users/v2/{userId}/revoke-tokens

      return { revoked: 1 };
    } catch (error) {
      logger.error("Failed to revoke user sessions:", error);
      throw error;
    }
  }

  /**
   * Get user information by ID
   * @param userId The user ID to fetch
   *
   * NOTE: This is a POC implementation.
   * In production, you would call Frontegg's API
   */
  async getUserById(userId: string): Promise<FronteggUser | null> {
    try {
      const config = getFronteggConfig();

      logger.debug(
        `POC: Fetching user ${userId} with config: ${config.clientId}`,
      );

      // POC: In production, make API call to Frontegg
      // Example: GET {baseUrl}/identity/resources/users/v2/{userId}

      return {
        id: userId,
        email: "user@example.com",
        name: "Frontegg User",
        tenantId: "tenant-id",
        tenantIds: ["tenant-id"],
        roles: ["user"],
        permissions: [],
      };
    } catch (error) {
      logger.error(`Failed to get user by ID: ${userId}`, error);
      return null;
    }
  }

  /**
   * Check if Frontegg is properly configured
   */
  isConfigured(): boolean {
    try {
      getFronteggConfig();
      return true;
    } catch {
      return false;
    }
  }
}

export default new FronteggAuthService();
