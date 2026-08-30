const bookPrefix = "/book/";

/** True for public booking paths that must not boot the calendar shell. */
export function isBookingPathname(pathname: string): boolean {
  return (
    pathname === bookPrefix.slice(0, -1) ||
    pathname.startsWith(bookPrefix) ||
    pathname.startsWith("/book/cancel/")
  );
}
