export type ImportGCalOperation = "INCREMENTAL" | "REPAIR";

export type ImportGCalEndPayload =
  | {
      operation: ImportGCalOperation;
      status: "COMPLETED";
      eventsCount?: number;
      calendarsCount?: number;
    }
  | {
      operation: ImportGCalOperation;
      status: "ERRORED" | "IGNORED";
      message: string;
    };
