import { _confirm, log } from "@scripts/common/cli.utils";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";

const WARNING_MESSAGE = `⚠️ WARNING ⚠️

This operation will:
1. Create multiple events in your Compass calendar
2. Create multiple events in your main Google Calendar

It is recommended to use a test account instead of your personal account.

Do you want to continue?`;

export const startSeedFlow = async (force = false) => {
  await mongoService.waitUntilConnected();
  if (!force) {
    const shouldProceed = await _confirm(WARNING_MESSAGE);
    if (!shouldProceed) {
      log.info("Operation cancelled by user");
      process.exit(0);
    }
  }

  try {
    log.info("Creating sample events...");

    const sampleEvents = [
      {
        title: "Weekly Team Meeting",
        description: "Weekly meeting to discuss project progress",
        start: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        duration: 60, // 60 minutes
        isRecurring: true,
        recurrence: {
          frequency: "weekly",
          interval: 1,
        },
      },
      {
        title: "Sprint Review",
        description: "Review achieved goals and plan next sprint",
        start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
        duration: 120, // 2 hours
        isRecurring: false,
      },
      {
        title: "1:1 with Mentor",
        description: "Individual mentoring session",
        start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
        duration: 30, // 30 minutes
        isRecurring: true,
        recurrence: {
          frequency: "biweekly",
          interval: 2,
        },
      },
    ];

    for (const eventData of sampleEvents) {
      await eventService.createEvent(eventData);
      log.info(`✓ Event created: ${eventData.title}`);
    }

    log.success("Sample events created successfully");
  } catch (error) {
    log.error(`Error creating sample events: ${error}`);
    process.exit(1);
  }

  process.exit(0);
};
