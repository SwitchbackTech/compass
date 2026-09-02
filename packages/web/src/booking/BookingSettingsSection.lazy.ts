import { lazyRouteComponent } from "@tanstack/react-router";

// Lazy: SettingsModal mounts unconditionally in CompassRequiredProviders, so
// a static import here puts the whole booking admin stack (weekly-hours and
// date-override editors, the timezone combobox, the booking Zod contracts) in
// the boot chunk of every page load — ~21KB gz that production never runs,
// since IS_BOOKING_ENABLED is false outside dev. This is the only static edge
// into that graph. No preload helper: unlike the event form, the section is
// already behind a settings page the user has to navigate to.
export const LazyBookingSettingsSection = lazyRouteComponent(
  () => import("@web/booking/BookingSettingsSection"),
  "BookingSettingsSection",
);
