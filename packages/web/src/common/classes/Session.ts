import { EventEmitter2, ListenerFn } from "eventemitter2";
import { fromEventPattern } from "rxjs";
import SuperTokensSession from "supertokens-web-js/recipe/session";
import { Event } from "supertokens-website/lib/build/types";

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

  #handleAllEvents(handler: ListenerFn) {
    this.#emitter.addListener("*", handler);
  }

  #removeAllEventsHandler(handler: ListenerFn) {
    this.#emitter.removeListener("*", handler);
  }

  events = fromEventPattern<Event>(
    this.#handleAllEvents.bind(this),
    this.#removeAllEventsHandler.bind(this),
  );

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
