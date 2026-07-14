import SuperTokensSession from "supertokens-web-js/recipe/session";
import { type Event } from "supertokens-website/lib/build/types";

class Session {
  #listeners = new Set<(event: Event) => void>();

  doesSessionExist = SuperTokensSession.doesSessionExist;
  getUserId = SuperTokensSession.getUserId;
  signOut = SuperTokensSession.signOut;
  getAccessToken = SuperTokensSession.getAccessToken;
  validateClaims = SuperTokensSession.validateClaims;
  getClaimValue = SuperTokensSession.getClaimValue;
  PrimitiveClaim = SuperTokensSession.PrimitiveClaim;
  BooleanClaim = SuperTokensSession.BooleanClaim;
  PrimitiveArrayClaim = SuperTokensSession.PrimitiveArrayClaim;
  attemptRefreshingSession = SuperTokensSession.attemptRefreshingSession;
  getInvalidClaimsFromResponse =
    SuperTokensSession.getInvalidClaimsFromResponse;
  getAccessTokenPayloadSecurely =
    SuperTokensSession.getAccessTokenPayloadSecurely;

  /**
   * Subscribe to every emitted session event.
   * Returns an unsubscribe function.
   */
  onAnyEvent(listener: (event: Event) => void): () => void {
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  emit(payload: Event) {
    for (const listener of this.#listeners) listener(payload);
  }
}

export const session = new Session();
