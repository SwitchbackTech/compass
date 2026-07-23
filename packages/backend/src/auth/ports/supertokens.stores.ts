import { type UserMetadata } from "@core/types/user.types";

export interface UserMetadataStore {
  getUserMetadata(
    userId: string,
  ): Promise<{ status: "OK"; metadata: UserMetadata }>;
  updateUserMetadata(
    userId: string,
    data: Partial<UserMetadata>,
  ): Promise<{ status: "OK"; metadata: UserMetadata }>;
  reset(): void;
}

export interface UserIdMappingStore {
  getUserIdMapping(input: {
    userId: string;
    userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
    userContext?: Record<string, unknown>;
  }): Promise<
    | {
        status: "OK";
        superTokensUserId: string;
        externalUserId: string;
      }
    | { status: "UNKNOWN_MAPPING_ERROR" }
  >;
  createUserIdMapping(input: {
    superTokensUserId: string;
    externalUserId: string;
    externalUserIdInfo?: string;
    userContext?: Record<string, unknown>;
    force?: boolean;
  }): Promise<
    | { status: "OK" | "UNKNOWN_SUPERTOKENS_USER_ID_ERROR" }
    | {
        status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR";
        doesSuperTokensUserIdExist: boolean;
        doesExternalUserIdExist: boolean;
      }
  >;
  reset(): void;
}

export function createInMemoryUserMetadataStore(): UserMetadataStore {
  const userMetadata = new Map<string, UserMetadata>();

  return {
    async getUserMetadata(userId) {
      return {
        status: "OK",
        metadata: userMetadata.get(userId) ?? {},
      };
    },
    async updateUserMetadata(userId, data) {
      const existingMetadata = userMetadata.get(userId) ?? {};
      const metadata = { ...existingMetadata, ...data };
      userMetadata.set(userId, metadata);
      return { status: "OK", metadata };
    },
    reset() {
      userMetadata.clear();
    },
  };
}

export function createInMemoryUserIdMappingStore(): UserIdMappingStore {
  /** superTokensUserId -> externalUserId */
  const mappings = new Map<string, string>();

  return {
    async getUserIdMapping(input) {
      const userIdType = input.userIdType ?? "SUPERTOKENS";

      if (userIdType === "EXTERNAL") {
        for (const [superTokensUserId, externalUserId] of mappings) {
          if (externalUserId === input.userId) {
            return {
              status: "OK",
              superTokensUserId,
              externalUserId,
            };
          }
        }
        return { status: "UNKNOWN_MAPPING_ERROR" };
      }

      const externalUserId = mappings.get(input.userId);
      if (externalUserId) {
        return {
          status: "OK",
          superTokensUserId: input.userId,
          externalUserId,
        };
      }

      if (userIdType === "ANY") {
        for (const [superTokensUserId, mappedExternalUserId] of mappings) {
          if (mappedExternalUserId === input.userId) {
            return {
              status: "OK",
              superTokensUserId,
              externalUserId: mappedExternalUserId,
            };
          }
        }
      }

      return { status: "UNKNOWN_MAPPING_ERROR" };
    },
    async createUserIdMapping(input) {
      const existingExternal = mappings.get(input.superTokensUserId);
      const exists = existingExternal === input.externalUserId;

      if (existingExternal && !input.force) {
        return {
          status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR",
          doesSuperTokensUserIdExist: exists,
          doesExternalUserIdExist: true,
        };
      }

      mappings.set(input.superTokensUserId, input.externalUserId);
      return { status: "OK" };
    },
    reset() {
      mappings.clear();
    },
  };
}
