// // Assuming this model exists
// import { Types } from "mongoose";
// import { gSchema$Event, gSchema$Events } from "@core/types/gcal";
// // Assuming this model exists
// import InstanceExceptionModel, {
//   ICompassInstanceException,
// } from "@backend/event/models/instanceException.model";
// // Assume Mongoose models are imported correctly
// // Adjust paths as needed for your project structure
// import MasterEventModel, {
//   ICompassMasterEvent,
// } from "@backend/event/models/masterEvent.model";

// // For ObjectId if needed for userId mapping

// // --- Data Mapping Helper (Example) ---
// // You'll need robust mapping from gSchema$Event to your Mongoose schemas

// interface MappedMasterEventData {
//   gcalEventId: string;
//   iCalUID?: string | null;
//   userId?: Types.ObjectId; // Assuming you link events to a user
//   summary?: string | null;
//   description?: string | null;
//   start?: {
//     dateTime?: Date | null;
//     date?: Date | null;
//     timeZone?: string | null;
//   };
//   end?: {
//     dateTime?: Date | null;
//     date?: Date | null;
//     timeZone?: string | null;
//   };
//   recurrence?: string[] | null;
//   status?: string | null;
//   sequence?: number | null;
//   creatorEmail?: string | null;
//   organizerEmail?: string | null;
//   attendees?: gSchema$Event["attendees"]; // Store directly if schema matches
//   location?: string | null;
//   // Add other fields from your ICompassMasterEvent schema
//   updatedGcal: Date; // Store Google's updated timestamp
// }

// interface MappedInstanceExceptionData {
//   gcalEventId: string; // Instance ID (e.g., masterId_timestampZ)
//   masterGcalEventId: string; // Link to the master event's gcalEventId
//   originalStartTime: { dateTime?: Date | null; timeZone?: string | null };
//   userId?: Types.ObjectId;
//   summary?: string | null;
//   description?: string | null;
//   start?: { dateTime?: Date | null; timeZone?: string | null }; // Instances usually have dateTime
//   end?: { dateTime?: Date | null; timeZone?: string | null };
//   status?: string | null;
//   sequence?: number | null;
//   // Add other fields from your ICompassInstanceException schema
//   updatedGcal: Date; // Store Google's updated timestamp
// }

// /**
//  * Maps Google Calendar event data to the Master Event schema format.
//  * Handles date conversions and potential null values.
//  */
// function mapToMasterSchema(
//   event: gSchema$Event,
//   userId?: Types.ObjectId,
// ): MappedMasterEventData {
//   // Basic mapping - expand with all your schema fields and proper type checks/conversions
//   return {
//     gcalEventId: event.id!, // Assume ID is always present after initial check
//     iCalUID: event.iCalUID,
//     userId: userId, // Pass userId if available in context
//     summary: event.summary,
//     description: event.description,
//     // Convert date/dateTime strings to Date objects
//     start: {
//       dateTime: event.start?.dateTime ? new Date(event.start.dateTime) : null,
//       date: event.start?.date ? new Date(event.start.date) : null, // Handle all-day events
//       timeZone: event.start?.timeZone,
//     },
//     end: {
//       dateTime: event.end?.dateTime ? new Date(event.end.dateTime) : null,
//       date: event.end?.date ? new Date(event.end.date) : null, // Handle all-day events
//       timeZone: event.end?.timeZone,
//     },
//     recurrence: event.recurrence,
//     status: event.status,
//     sequence: event.sequence,
//     creatorEmail: event.creator?.email,
//     organizerEmail: event.organizer?.email,
//     attendees: event.attendees,
//     location: event.location,
//     updatedGcal: new Date(event.updated!), // Assume updated is always present
//   };
// }

// /**
//  * Maps Google Calendar event data to the Instance Exception schema format.
//  */
// function mapToInstanceSchema(
//   event: gSchema$Event,
//   userId?: Types.ObjectId,
// ): MappedInstanceExceptionData {
//   if (!event.recurringEventId || !event.originalStartTime?.dateTime) {
//     // This should ideally not happen if called correctly, but good practice to check
//     throw new Error(
//       `Missing recurringEventId or originalStartTime for instance: ${event.id}`,
//     );
//   }
//   return {
//     gcalEventId: event.id!,
//     masterGcalEventId: event.recurringEventId,
//     originalStartTime: {
//       // originalStartTime only has dateTime in gSchema
//       dateTime: new Date(event.originalStartTime.dateTime),
//       timeZone: event.originalStartTime.timeZone,
//     },
//     userId: userId,
//     summary: event.summary,
//     description: event.description,
//     start: {
//       // Instances typically use dateTime
//       dateTime: event.start?.dateTime ? new Date(event.start.dateTime) : null,
//       timeZone: event.start?.timeZone,
//     },
//     end: {
//       dateTime: event.end?.dateTime ? new Date(event.end.dateTime) : null,
//       timeZone: event.end?.timeZone,
//     },
//     status: event.status,
//     sequence: event.sequence,
//     updatedGcal: new Date(event.updated!),
//   };
// }

// // --- Database Interaction Logic ---
// // Place these in appropriate service/repository files in a real app

// async function upsertMasterEvent(
//   eventData: MappedMasterEventData,
// ): Promise<void> {
//   console.log(`[DB] Upserting Master Event: ${eventData.gcalEventId}`);
//   // Use findOneAndUpdate with upsert: true to handle both insert and update
//   await MasterEventModel.findOneAndUpdate(
//     { gcalEventId: eventData.gcalEventId }, // Find condition
//     { $set: eventData }, // Use $set to update fields
//     { upsert: true, new: true, runValidators: true }, // Options: create if not found, return new doc, run schema validation
//   ).exec(); // Use exec() for promises with Mongoose
// }

// async function upsertInstanceException(
//   eventData: MappedInstanceExceptionData,
// ): Promise<void> {
//   console.log(`[DB] Upserting Instance Exception: ${eventData.gcalEventId}`);
//   await InstanceExceptionModel.findOneAndUpdate(
//     { gcalEventId: eventData.gcalEventId },
//     { $set: eventData },
//     { upsert: true, new: true, runValidators: true },
//   ).exec();
// }

// async function deleteSeries(masterGcalEventId: string): Promise<void> {
//   console.log(
//     `[DB] Deleting Series initiated by Master ID: ${masterGcalEventId}`,
//   );
//   // 1. Delete the master event itself
//   const deletedMaster = await MasterEventModel.findOneAndDelete({
//     gcalEventId: masterGcalEventId,
//   }).exec();
//   if (!deletedMaster) {
//     console.log(
//       `[DB] Master event ${masterGcalEventId} not found for deletion.`,
//     );
//     // Might already be deleted, or it's an instance cancellation - proceed to check instances
//   } else {
//     console.log(`[DB] Deleted master event ${masterGcalEventId}.`);
//   }

//   // 2. Delete all associated instance exceptions
//   // It's crucial that instances are linked via masterGcalEventId in your schema
//   const deleteResult = await InstanceExceptionModel.deleteMany({
//     masterGcalEventId: masterGcalEventId,
//   }).exec();
//   console.log(
//     `[DB] Deleted ${deleteResult.deletedCount} instance exceptions associated with master ${masterGcalEventId}.`,
//   );

//   // Note: If splits created *new* master IDs not linked via recurringEventId,
//   // deleting only by the original master ID might not remove the split-off parts.
//   // Deleting based on iCalUID base might be more robust if needed, but adds complexity.
//   // The current approach assumes cancellation of the *original* master means delete all linked exceptions.
//   // Cancellation of a *split-off* master will trigger its own deletion cycle.
// }

// async function deleteInstanceException(
//   instanceGcalEventId: string,
// ): Promise<void> {
//   console.log(`[DB] Deleting Instance Exception: ${instanceGcalEventId}`);
//   const deleteResult = await InstanceExceptionModel.deleteOne({
//     gcalEventId: instanceGcalEventId,
//   }).exec();
//   if (deleteResult.deletedCount === 0) {
//     console.log(
//       `[DB] Instance exception ${instanceGcalEventId} not found for deletion.`,
//     );
//   } else {
//     console.log(`[DB] Deleted instance exception ${instanceGcalEventId}.`);
//   }
// }

// // --- Main Sync Processing Function ---

// /**
//  * Processes the items from a Google Calendar events.list sync response
//  * by applying incremental state changes to the MongoDB database.
//  *
//  * @param syncPayload The full response object from gcal.events.list({ syncToken: ... })
//  * @param userId The ObjectId of the user whose calendar is being synced (optional, but needed for mapping)
//  * @returns The nextSyncToken to be stored for the subsequent sync.
//  * @throws Error if essential data is missing or processing fails critically.
//  */
// export async function processGcalSyncPayload(
//   syncPayload: gSchema$Events,
//   userId?: Types.ObjectId, // Pass the relevant user ID
// ): Promise<string> {
//   const itemsToProcess = syncPayload.items;
//   const nextSyncToken = syncPayload.nextSyncToken;

//   if (!itemsToProcess) {
//     console.warn("No items found in the sync payload.");
//     if (!nextSyncToken) {
//       throw new Error("Sync payload missing nextSyncToken and has no items.");
//     }
//     return nextSyncToken;
//   }
//   if (!nextSyncToken) {
//     throw new Error("Sync payload missing nextSyncToken.");
//   }

//   console.log(
//     `Processing ${itemsToProcess.length} items from sync payload for user ${userId}...`,
//   );

//   for (const item of itemsToProcess) {
//     if (!item || !item.id) {
//       console.warn("Skipping invalid item in sync payload:", item);
//       continue;
//     }

//     try {
//       // --- Cancellation Logic ---
//       if (item.status === "cancelled") {
//         if (item.recurrence && !item.recurringEventId) {
//           // --- Cancelled Master Event ---
//           // Reference: User deletes entire series.
//           console.log(`Processing cancelled master: ${item.id}`);
//           await deleteSeries(item.id); // Deletes master + linked instances
//         } else if (item.recurringEventId) {
//           // --- Cancelled Instance Event ---
//           // Reference: User deletes "Just this instance".
//           console.log(`Processing cancelled instance: ${item.id}`);
//           await deleteInstanceException(item.id);
//         } else {
//           console.log(`Processing cancelled single event: ${item.id}`);
//           // await deleteSingleEvent(item.id); // Add if needed
//         }
//       }
//       // --- Upsert Logic for Active Events ---
//       else {
//         if (item.recurrence && !item.recurringEventId) {
//           // --- Upsert Master Event ---
//           // Ref: `createNewRecurringEventPayload` -> INSERT
//           // Ref: `allPayload1` (item 1, id="68k...") -> UPDATE (summary, recurrence)
//           // Ref: `thisAndFollowing1Payload` (item 1, id="4k3...") -> UPDATE (recurrence adds UNTIL)
//           // Ref: `thisAndFollowing1Payload` (item 2, id="4k3..._R...") -> INSERT (new following master)
//           // Ref: `thisAndFollowing0Payload` (item 1, id="5hn...") -> UPDATE (recurrence adds UNTIL)
//           // Ref: `thisAndFollowing0Payload` (item 2, id="e5s...") -> INSERT (new following master, diff ID)
//           console.log(`Processing active master: ${item.id}`);
//           const masterData = mapToMasterSchema(item, userId);
//           await upsertMasterEvent(masterData);
//         } else if (item.recurringEventId && item.originalStartTime?.dateTime) {
//           // --- Upsert Instance/Exception ---
//           // Ref: `singleInstance1Payload` (item 2, id="68k..._2025...") -> INSERT (new exception)
//           // Ref: `allPayload1` (item 2, id="68k..._2025...") -> Upsert (reflects master change, may create/update exception)
//           // Ref: `thisAndFollowing2Payload` (items 2 & 3) -> UPDATE (existing exceptions)
//           console.log(`Processing active instance/exception: ${item.id}`);
//           const instanceData = mapToInstanceSchema(item, userId);
//           await upsertInstanceException(instanceData);
//         } else if (!item.recurrence && !item.recurringEventId) {
//           // Upsert single, non-recurring event
//           console.log(`Processing active single event: ${item.id}`);
//           // const singleEventData = mapToSingleEventSchema(item, userId); // Define if needed
//           // await upsertSingleEvent(singleEventData); // Add if needed
//         } else {
//           console.warn(
//             `Skipping item with unexpected combination of recurrence/recurringEventId: ${item.id}`,
//             item,
//           );
//         }
//       }
//     } catch (error) {
//       console.error(
//         `Failed to process item ${item.id} for user ${userId}. Error:`,
//         error,
//       );
//       // Consider strategy: Stop vs. Continue? Logging and continuing is often better for sync.
//       // Rethrow error if it's critical and should halt the process?
//       // throw error;
//     }
//   }

//   console.log(`Finished processing sync payload for user ${userId}.`);
//   return nextSyncToken;
// }

// // **To Integrate This:**

// // 2.  **Mapping:** Flesh out the `mapToMasterSchema` and `mapToInstanceSchema` functions to accurately convert all the fields you care about from the `gSchema$Event` format to your specific Mongoose schema structure, including proper handling of dates, timezones, and potential nulls.
// // 3.  **DB Logic:** Implement the actual database operations (`findOneAndUpdate`, `findOneAndDelete`, `deleteMany`, `deleteOne`) within the `upsert/delete` functions, replacing the `console.log` mocks. Place this logic in appropriate service or repository files according to your backend architecture.
// // 4.  **Call Site:** Modify your webhook handler (or wherever you call `gcal.events.list` with the sync token) to call `processGcalSyncPayload` instead of the old parser logic. Pass the relevant `userId` if your events are user-specific.
// // 5.  **Error Handling:** Implement robust error handling, especially for the 410 "Gone" error for invalid sync tokens, which requires triggering a full re-sync. Decide how to handle individual item processing errors (log and continue recommended).
// // 6.  **Transactions:** For increased data consistency, consider wrapping the processing loop for a single sync payload within a MongoDB transaction if your setup supports it. This ensures that either all changes from a payload are applied or none a
