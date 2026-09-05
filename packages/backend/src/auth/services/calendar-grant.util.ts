import {
  GOOGLE_SCOPE_CALENDAR_EVENTS,
  GOOGLE_SCOPE_CALENDAR_READONLY,
} from "@core/providers/google.scopes";
import { MICROSOFT_SCOPE_CALENDARS_READWRITE } from "@core/providers/microsoft.scopes";

const CALENDAR_SCOPES = new Set<string>([
  GOOGLE_SCOPE_CALENDAR_EVENTS,
  GOOGLE_SCOPE_CALENDAR_READONLY,
  MICROSOFT_SCOPE_CALENDARS_READWRITE,
]);

/** Sign-in adopts a calendar connection only when the grant includes a calendar scope. */
export function grantedScopesIncludeCalendarAccess(
  scopes: readonly string[],
): boolean {
  return scopes.some((scope) => CALENDAR_SCOPES.has(scope));
}

export function parseGrantedScopes(scope: string | null | undefined): string[] {
  return (scope ?? "").split(/\s+/).filter(Boolean);
}
