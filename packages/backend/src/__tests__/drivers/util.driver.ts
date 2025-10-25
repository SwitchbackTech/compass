import { CalendarProvider } from "@core/types/calendar.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";

export class UtilDriver {
  static getProviderTestState(provider: CalendarProvider) {
    const testState = compassTestState().get(provider);

    if (!testState) throw new Error(`Provider${provider} Not Initialized`);

    return testState;
  }

  static getUserTestState(provider: CalendarProvider, user: string) {
    const testState = UtilDriver.getProviderTestState(provider);

    const userTestState = testState.get(
      zObjectId
        .parse(user, { error: () => "invalid or no user id supplied" })
        .toString(),
    );

    if (!userTestState) {
      throw new Error(`This user does not exist with this provider`);
    }

    return userTestState;
  }

  static getCalendarTestState(
    provider: CalendarProvider,
    user: string,
    providerCalendarId?: string,
  ) {
    const testState = UtilDriver.getUserTestState(provider, user);

    const calendar = testState.calendars.get(
      StringV4Schema.parse(providerCalendarId, {
        error: () => "invalid or no calendar id supplied",
      }),
    );

    if (!calendar) {
      throw new Error(
        "This calendar does not exist for this user within this provider",
      );
    }

    return calendar;
  }
}
