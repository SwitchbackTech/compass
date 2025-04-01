import { Collection, ObjectId } from "mongodb";
import {
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { generateRecurringInstances } from "../../util/recur.util";
import { RecurringEventProvider } from "../recur.provider.interface";

export class CompassRecurringEventProvider implements RecurringEventProvider {
  constructor(
    private collection: Collection<Schema_Event>,
    private userId: string,
  ) {}

  async createSeries(
    event: Schema_Event_Recur_Base,
    maxInstances = 100,
  ): Promise<{ insertedId: string }> {
    // Generate all instances including the base event
    const events = generateRecurringInstances(event, maxInstances);

    // Convert events to MongoDB format by removing _id and ensuring all fields are strings
    const eventsToInsert = events.map((event) => {
      const { _id, ...eventWithoutId } = event;
      return {
        ...eventWithoutId,
        _id: undefined, // Let MongoDB generate the _id
      };
    });

    // Insert all events at once
    const result = await this.collection.insertMany(eventsToInsert);

    // Return the ID of the base event (first event)
    const baseEventId = result.insertedIds[0]?.toString();
    if (!baseEventId) {
      throw error(
        GenericError.DeveloperError,
        "Failed to create recurring event series because baseId was missing",
      );
    }
    return { insertedId: baseEventId };
  }

  async deleteAllInstances(
    baseEventId: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteMany({
      "recurrence.eventId": baseEventId,
    });
    return { deletedCount: result.deletedCount };
  }

  async deleteInstance(eventId: string): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteOne({ _id: eventId });
    return { deletedCount: result.deletedCount };
  }

  async deleteInstances(baseId: string): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteMany({
      user: this.userId,
      _id: { $ne: baseId },
      "recurrence.eventId": baseId,
    });
    return { deletedCount: result.deletedCount };
  }

  async deleteInstancesFromDate(
    baseEvent: Schema_Event_Recur_Base,
    fromDate: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteMany({
      user: this.userId,
      "recurrence.eventId": baseEvent._id,
      startDate: { $gte: fromDate },
    });
    return { deletedCount: result.deletedCount };
  }

  async deleteSeries(
    baseEvent: Schema_Event,
  ): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteMany({
      user: this.userId,
      $or: [
        { _id: baseEvent._id }, // Match the base event itself
        { "recurrence.eventId": baseEvent._id }, // Match all instances
      ],
    });
    return { deletedCount: result.deletedCount };
  }

  async deleteSingleInstance(
    instance: Schema_Event,
  ): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteOne({
      user: this.userId,
      _id: instance._id,
    });
    return { deletedCount: result.deletedCount };
  }

  async expandInstances(baseEvent: Schema_Event_Recur_Base) {
    const instances = await this.collection
      .find({
        user: this.userId,
        "recurrence.eventId": baseEvent._id,
      })
      .toArray();
    return instances as Schema_Event_Recur_Instance[];
  }

  async insertBaseEvent(event: Schema_Event): Promise<{ insertedId: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...eventWithoutId } = event;
    const result = await this.collection.insertOne(
      eventWithoutId as Schema_Event_Recur_Base,
    );

    return { insertedId: result.insertedId.toString() };
  }

  async insertEventInstances(
    instances: Schema_Event[],
  ): Promise<{ insertedIds: string[] }> {
    const instancesWithoutIds = instances.map(({ _id, ...rest }) => rest);
    const result = await this.collection.insertMany(
      instancesWithoutIds as Schema_Event_Recur_Instance[],
    );

    return {
      insertedIds: Object.values(result.insertedIds).map((id) => id.toString()),
    };
  }

  async updateInstance(
    instance: Schema_Event_Recur_Instance,
  ): Promise<{ matchedCount: number }> {
    const { _id, ...instanceWithoutId } = instance;
    const result = await this.collection.updateOne(
      { user: this.userId, _id: instance._id },
      { $set: instanceWithoutId },
    );

    return { matchedCount: result.matchedCount };
  }

  async updateFutureInstances(
    event: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    if (!event.recurrence?.eventId) {
      throw error(
        GenericError.DeveloperError,
        "Failed to update recurring event series because eventId was missing",
      );
    }

    const { _id, startDate, endDate, user, ...eventWithEligibleFields } = event;
    const result = await this.collection.updateMany(
      {
        user: this.userId,
        "recurrence.eventId": event.recurrence.eventId,
        startDate: { $gt: event.startDate },
      },
      { $set: eventWithEligibleFields },
    );

    return { matchedCount: result.matchedCount };
  }

  async updateBaseEventRecurrence(
    baseEventId: string,
    rule: string[],
  ): Promise<{ matchedCount: number }> {
    const result = await this.collection.updateOne(
      { _id: baseEventId },
      { $set: { recurrence: { rule } } },
    );
    return { matchedCount: result.matchedCount };
  }

  async updateSeries(
    modifiedInstance: Schema_Event_Recur_Instance,
  ): Promise<{ matchedCount: number }> {
    if (!modifiedInstance.recurrence?.eventId) {
      throw error(
        GenericError.DeveloperError,
        "Failed to update recurring event series because eventId was missing",
      );
    }

    // Get the original base event
    const originalBase = await this.collection.findOne({
      _id: modifiedInstance.recurrence.eventId,
    });

    if (
      !originalBase ||
      !originalBase.recurrence?.rule ||
      !modifiedInstance.startDate
    ) {
      throw error(
        GenericError.DeveloperError,
        "Failed to update recurring event series because required fields were missing",
      );
    }

    // Update the original base event to end before the modified instance
    const untilDate =
      new Date(modifiedInstance.startDate)
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";

    await this.collection.updateOne(
      { _id: originalBase._id },
      {
        $set: {
          recurrence: {
            rule: [`RRULE:FREQ=WEEKLY;UNTIL=${untilDate}`],
          },
        },
      },
    );

    // Create a new base event starting from the modified instance with updated data
    const newBase: Schema_Event_Recur_Base = {
      ...modifiedInstance,
      _id: new ObjectId().toString(),
      recurrence: {
        rule: originalBase.recurrence.rule,
      },
    };
    await this.insertBaseEvent(newBase);

    // Update all future instances to point to the new base event and have the modified data
    const { _id, recurrence, ...modifiedData } = modifiedInstance;
    const result = await this.collection.updateMany(
      {
        user: this.userId,
        "recurrence.eventId": originalBase._id,
        startDate: { $gte: modifiedInstance.startDate },
      },
      {
        $set: {
          "recurrence.eventId": newBase._id,
          ...modifiedData,
        },
      },
    );

    return { matchedCount: result.matchedCount + 2 }; // +2 for the base events
  }

  async updateSeriesWithSplit(
    originalBase: Schema_Event_Recur_Base,
    modifiedInstance: Schema_Event_Recur_Instance,
  ): Promise<{ modifiedCount: number }> {
    if (!modifiedInstance.startDate || !originalBase.recurrence?.rule) {
      throw error(
        GenericError.DeveloperError,
        "Failed to update recurring event series because required fields were missing",
      );
    }

    // Update the original base event to end before the modified instance
    const untilDate =
      new Date(modifiedInstance.startDate)
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";

    await this.collection.updateOne(
      { _id: originalBase._id },
      {
        $set: {
          recurrence: {
            rule: [`RRULE:FREQ=WEEKLY;UNTIL=${untilDate}`],
          },
        },
      },
    );

    // Convert the modified instance into the new base event
    const { _id, recurrence, ...modifiedData } = modifiedInstance;
    await this.collection.updateOne(
      { _id: modifiedInstance._id },
      {
        $set: {
          ...modifiedData,
          recurrence: {
            rule: originalBase.recurrence.rule,
          },
        },
      },
    );

    // Update all instances from the modified instance onwards to point to the new base
    const result = await this.collection.updateMany(
      {
        user: this.userId,
        "recurrence.eventId": originalBase._id,
        startDate: { $gte: modifiedInstance.startDate },
      },
      {
        $set: {
          "recurrence.eventId": modifiedInstance._id,
          ...modifiedData,
        },
      },
    );

    return { modifiedCount: result.modifiedCount };
  }

  async updateEntireSeries(
    originalBase: Schema_Event,
    updatedBase: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    const { _id, ...updatedData } = updatedBase;
    const result = await this.collection.updateMany(
      {
        user: this.userId,
        $or: [
          { _id: originalBase._id }, // Match the base event itself
          { "recurrence.eventId": originalBase._id }, // Match all instances
        ],
      },
      { $set: updatedData },
    );
    return { matchedCount: result.matchedCount };
  }
}
