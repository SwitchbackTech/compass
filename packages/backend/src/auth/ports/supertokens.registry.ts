import {
  createUserIdMapping as supertokensCreateUserIdMapping,
  getUserIdMapping as supertokensGetUserIdMapping,
} from "supertokens-node";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import {
  createInMemoryUserIdMappingStore,
  createInMemoryUserMetadataStore,
  type UserIdMappingStore,
  type UserMetadataStore,
} from "@backend/auth/ports/supertokens.stores";

const productionMetadataStore: UserMetadataStore = {
  getUserMetadata: (userId) => UserMetadata.getUserMetadata(userId),
  updateUserMetadata: (userId, data) =>
    UserMetadata.updateUserMetadata(userId, data),
  reset: () => {},
};

const productionMappingStore: UserIdMappingStore = {
  getUserIdMapping: (input) => supertokensGetUserIdMapping(input),
  createUserIdMapping: (input) => supertokensCreateUserIdMapping(input),
  reset: () => {},
};

let userMetadataStore: UserMetadataStore = productionMetadataStore;
let userIdMappingStore: UserIdMappingStore = productionMappingStore;

export function getUserMetadataStore(): UserMetadataStore {
  return userMetadataStore;
}

export function getUserIdMappingStore(): UserIdMappingStore {
  return userIdMappingStore;
}

export function registerUserMetadataStore(store: UserMetadataStore): void {
  userMetadataStore = store;
}

export function registerUserIdMappingStore(store: UserIdMappingStore): void {
  userIdMappingStore = store;
}

export function resetSupertokensStores(): void {
  userMetadataStore = productionMetadataStore;
  userIdMappingStore = productionMappingStore;
}

export {
  createInMemoryUserMetadataStore,
  createInMemoryUserIdMappingStore,
};
