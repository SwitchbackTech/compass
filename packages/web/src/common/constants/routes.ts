export const ROOT_ROUTES = {
  API: "/api",
  CLEANUP: "/cleanup",
  GOOGLE_AUTH_CALLBACK: "/auth/google/callback",
  LIFE: "/life",
  ROOT: "/",
  WEEK: "/week",
  WEEK_DATE: "/week/$dateString",
  DAY: "/day",
  DAY_DATE: "/day/$dateString",
} as const;

// TanStack route *ids* (used for useMatch/useParams `from`), which diverge
// from the URL-shaped ROOT_ROUTES above under the pathless "authenticated"
// layout route. Kept as literals rather than importing the route objects
// from router.routes.tsx so hooks like useWeek don't drag in that module's
// (now eager) view component imports.
export const ROUTE_IDS = {
  DAY_DATE: "/authenticated/day/$dateString",
  WEEK_DATE: "/authenticated/week/$dateString",
} as const;
