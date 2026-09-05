import { GOOGLE_SCOPES } from "@core/providers/google.scopes";

// Keep the scopes configured for SuperTokens and the scopes persisted in Sync
// together. The browser independently verifies that Google granted this set
// before it sends its authorization code to Compass. Contacts permission is
// deliberately absent: it is requested only by the explicit contacts feature
// flow in Sync, so sign-in never includes an unapproved sensitive scope.
//
// This is the REQUIRED list: sign-in fails without every scope in it. It must
// stay in lockstep with the web's GOOGLE_AUTH_SCOPES_REQUIRED and the e2e
// REQUIRED_SCOPES list, and it must NEVER gain a contacts scope — contacts are
// optional, and requiring one would brick sign-in for every user who declines it.
export const GOOGLE_AUTH_SCOPES: string[] = [...GOOGLE_SCOPES];

// What the sign-in flow requests from Google. Keep this as a named export so
// the provider configuration declares its intent without copying the list.
export const GOOGLE_AUTH_SCOPES_REQUESTED = GOOGLE_AUTH_SCOPES;
