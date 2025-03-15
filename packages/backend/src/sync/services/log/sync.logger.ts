import dayjs from "dayjs";
import fs from "fs";
import { AnyBulkWriteOperation } from "mongodb";
import path from "path";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

interface SyncLogData {
  updatedEvents: gSchema$Event[];
  summary: {
    toUpdate: gSchema$Event[];
    toDelete: string[];
  };
  operations: AnyBulkWriteOperation<Schema_Event>[];
  nextSyncToken?: string;
}

export const logSyncOperation = async (
  userId: string,
  calendarId: string,
  data: SyncLogData,
) => {
  const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  const logDir = path.join(process.cwd(), "logs", "sync");
  const filename = `sync_${userId}_${timestamp}.json`;
  const fullPath = path.resolve(logDir, filename);

  // Ensure the fullPath is within the logDir
  if (!fullPath.startsWith(logDir)) {
    throw new Error("Invalid file path");
  }

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logContent = {
    timestamp: dayjs().toISOString(),
    userId,
    calendarId,
    updatedEvents: data.updatedEvents,
    summary: data.summary,
    operations: data.operations,
  };

  try {
    await fs.promises.writeFile(fullPath, JSON.stringify(logContent, null, 2));
    console.log(`Sync log written to ${fullPath}`);
  } catch (err) {
    console.error("Failed to write sync log:", err);
  }
};

//TODO delete
// export const getSummary = (
//   eventsToUpdate: gSchema$Event[],
//   eventsToDelete: string[],
//   resourceId: string,
// ) => {
//   let updateSummary = "";
//   let deleteSummary = "";
//   const min = 0;
//   const max = 3;

//   if (eventsToUpdate.length > min) {
//     if (eventsToUpdate.length < max) {
//       updateSummary = `Updating: "${eventsToUpdate
//         .map((e) => e.summary)
//         .toString()}" `;
//     } else {
//       updateSummary = `Updating ${eventsToUpdate.length} `;
//     }
//   }

//   if (eventsToDelete.length > min) {
//     if (eventsToDelete.length < max) {
//       const googleIds = eventsToDelete.toString();
//       deleteSummary = `Deleting: ${googleIds}`;
//     } else {
//       deleteSummary = ` Deleting ${eventsToDelete.length}`;
//     }
//   }

//   let summary = "";
//   if (updateSummary !== "") summary += updateSummary;
//   if (deleteSummary !== "") summary += deleteSummary;

//   summary += ` | ${resourceId}`;

//   return summary;
// };
