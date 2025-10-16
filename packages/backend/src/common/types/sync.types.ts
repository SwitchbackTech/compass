import { DeleteResult, InsertOneResult, UpdateResult } from "mongodb";
import { Result_Watch_Stop } from "@core/types/sync.types";

export interface Summary_Resync {
  _delete: {
    calendars?: UpdateResult;
    events?: DeleteResult;
    watches?: Result_Watch_Stop;
    sync?: UpdateResult;
  };
  recreate: {
    calendars?: UpdateResult;
    watches?: InsertOneResult[];
    events?: "success";
    sync?: UpdateResult;
  };
  revoke?: {
    sessionsRevoked?: number;
  };
}
