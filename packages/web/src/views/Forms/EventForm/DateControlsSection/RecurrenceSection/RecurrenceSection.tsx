import { isBackendUnavailable as getIsBackendUnavailable } from "@web/api/util/backend-unavailable-error.util";
import { useSession } from "@web/auth/compass/session/useSession";
import { createRecurrenceSection } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/createRecurrenceSection";

export type { RecurrenceSectionProps } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/createRecurrenceSection";

export const RecurrenceSection = createRecurrenceSection({
  isBackendUnavailable: getIsBackendUnavailable,
  useSession,
});
