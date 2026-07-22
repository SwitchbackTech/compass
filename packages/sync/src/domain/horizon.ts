import dayjs from "@core/util/date/dayjs";
import { type ProjectionHorizon } from "@sync/domain/occurrence-projection";

// The rolling window Sync materializes occurrences for. Queries clamp their
// requested range to it and projection fills exactly it, so the read model is
// complete out to the horizon edge and neither side ever scans beyond it. The
// two must stay in lockstep — hence one shared definition.
export const HORIZON_PAST_MONTHS = 12;
export const HORIZON_FUTURE_MONTHS = 18;

export function syncHorizon(now: Date): ProjectionHorizon {
  return {
    start: dayjs(now).subtract(HORIZON_PAST_MONTHS, "month").toDate(),
    end: dayjs(now).add(HORIZON_FUTURE_MONTHS, "month").toDate(),
  };
}
