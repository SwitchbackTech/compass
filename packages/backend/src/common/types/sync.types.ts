import { Result_Watch_Stop } from "@core/types/sync.types";
import { DeleteResult, UpdateResult } from "mongodb";

export interface Summary_Resync {
  _delete: {
    calendarlist?: UpdateResult;
    events?: DeleteResult;
    eventWatches?: Result_Watch_Stop;
    sync?: UpdateResult;
  };
  recreate: {
    calendarlist?: UpdateResult;
    eventWatches?: UpdateResult[];
    events?: "success";
    sync?: UpdateResult;
  };
  revoke: {
    sessionsRevoked?: number;
  };
}
