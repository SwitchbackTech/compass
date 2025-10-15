import { DeleteResult, InsertOneResult, UpdateResult } from "mongodb";
import { Result_Watch_Stop } from "@core/types/sync.types";

export interface Summary_Resync {
  _delete: {
    calendarlist?: UpdateResult;
    events?: DeleteResult;
    watches?: Result_Watch_Stop;
    sync?: UpdateResult;
  };
  recreate: {
    calendarlist?: UpdateResult;
    watches?: InsertOneResult[];
    events?: "success";
    sync?: UpdateResult;
  };
  revoke?: {
    sessionsRevoked?: number;
  };
}
