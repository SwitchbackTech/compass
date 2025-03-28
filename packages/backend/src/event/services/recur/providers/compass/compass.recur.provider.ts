import { Collection } from "mongodb";
import { Schema_Event } from "@core/types/event.types";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { generateRecurringInstances } from "../../util/recur.util";
import { RecurringEventProvider } from "../recur.provider.interface";

export class CompassRecurringEventProvider implements RecurringEventProvider {
  constructor(
    private collection: Collection<Schema_Event>,
    private userId: string,
  ) {}

  async createSeries(event: Schema_Event): Promise<{ insertedId: string }> {
    // Generate all instances including the base event
    const events = generateRecurringInstances(event);

    // Convert events to MongoDB format by removing _id and ensuring all fields are strings
    const eventsToInsert = events.map((event) => {
      const { _id, ...eventWithoutId } = event;
      return {
        ...eventWithoutId,
        _id: undefined, // Let MongoDB generate the _id
      } as Schema_Event;
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

  async deleteFutureInstances(
    baseEventId: string,
    fromDate: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteMany({
      "recurrence.eventId": baseEventId,
      startDate: { $gte: fromDate },
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
    baseEvent: Schema_Event,
    fromDate: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteMany({
      user: this.userId,
      "recurrence.eventId": baseEvent.recurrence?.eventId,
      startDate: { $gte: fromDate },
    });
    return { deletedCount: result.deletedCount };
  }

  async deleteSeries(
    baseEvent: Schema_Event,
  ): Promise<{ deletedCount: number }> {
    const result = await this.collection.deleteMany({
      user: this.userId,
      "recurrence.eventId": baseEvent.recurrence?.eventId,
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

  async expandRecurringEvent(baseEvent: Schema_Event): Promise<Schema_Event[]> {
    return this.collection
      .find({
        user: this.userId,
        "recurrence.eventId": baseEvent.recurrence?.eventId,
      })
      .toArray();
  }

  async insertBaseEvent(event: Schema_Event): Promise<{ insertedId: string }> {
    const { _id, ...eventWithoutId } = event;
    const result = await this.collection.insertOne(
      eventWithoutId as Schema_Event,
    );

    return { insertedId: result.insertedId.toString() };
  }

  async insertEventInstances(
    instances: Schema_Event[],
  ): Promise<{ insertedIds: string[] }> {
    const instancesWithoutIds = instances.map(({ _id, ...rest }) => rest);
    const result = await this.collection.insertMany(
      instancesWithoutIds as Schema_Event[],
    );

    return {
      insertedIds: Object.values(result.insertedIds).map((id) => id.toString()),
    };
  }

  async updateInstance(
    instance: Schema_Event,
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

  async updateBaseEventRecurrence(recurrence: {
    rule: string[];
    eventId: string;
  }): Promise<{ matchedCount: number }> {
    const result = await this.collection.updateOne(
      { gEventId: recurrence.eventId },
      { $set: { recurrence } },
    );
    return { matchedCount: result.matchedCount };
  }

  async updateSeries(event: Schema_Event): Promise<{ matchedCount: number }> {
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
      },
      { $set: eventWithEligibleFields },
    );

    return { matchedCount: result.matchedCount };
  }

  async updateSeriesWithSplit(
    originalBase: Schema_Event,
    newBase: Schema_Event,
    modifiedInstance: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    // First update the original base event
    await this.updateBaseEventRecurrence({
      rule: originalBase.recurrence?.rule || [],
      eventId: originalBase.recurrence?.eventId || "",
    });

    // Then insert the new base event
    await this.insertBaseEvent(newBase);

    // Finally update the modified instance
    await this.updateInstance(modifiedInstance);

    return { matchedCount: 3 };
  }

  async updateEntireSeries(
    originalBase: Schema_Event,
    updatedBase: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    const result = await this.collection.updateMany(
      {
        user: this.userId,
        "recurrence.eventId": originalBase.recurrence?.eventId,
      },
      { $set: updatedBase },
    );
    return { matchedCount: result.matchedCount };
  }
}
