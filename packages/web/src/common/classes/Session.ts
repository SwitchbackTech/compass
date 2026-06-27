import { EventEmitter2, type ListenerFn } from "eventemitter2";
import SuperTokensSession from "supertokens-web-js/recipe/session";
import { type Event } from "supertokens-website/lib/build/types";

class Session {
  #emitter: EventEmitter2 = new EventEmitter2({
    wildcard: true,
    delimiter: ".",
    newListener: false,
    removeListener: false,
    maxListeners: 10,
    verboseMemoryLeak: false,
    ignoreErrors: false,
  });

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
   * Subscribe to every emitted session event (wildcard listener).
   * Returns an unsubscribe function.
   */
  onAnyEvent(listener: (event: Event) => void): () => void {
    this.#emitter.addListener("*", listener as ListenerFn);

    return () => this.#emitter.removeListener("*", listener as ListenerFn);
  }

  emit(event: Event["action"], payload: Event) {
    this.#emitter.emit(event, payload);
  }

  on(event: Event["action"], listener: ListenerFn): void {
    this.#emitter.on(event, listener);
  }

  once(event: Event["action"], listener: ListenerFn): void {
    this.#emitter.once(event, listener);
  }

  off(event: Event["action"], listener: ListenerFn): void {
    this.#emitter.off(event, listener);
  }
}

export const session = new Session();
