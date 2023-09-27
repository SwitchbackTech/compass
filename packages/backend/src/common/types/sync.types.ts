import { DeleteResult, UpdateResult } from "mongodb";
import { Result_Watch_Stop } from "@core/types/sync.types";

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
