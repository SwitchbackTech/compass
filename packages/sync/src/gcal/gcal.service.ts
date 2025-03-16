import { Injectable } from '@nestjs/common';
import { gCalendar, gParamsImportAllEvents } from '@common/types/gcal';
import { GCalAuthService } from './gcal.auth.service';
import { Params_WatchEvents } from '@common/types/sync.types';
import { error } from '@common/errors/error.handler';
import { GcalError } from '@common/errors/error.constants';
@Injectable()
export class GCalService {
  constructor(private readonly gCalAuthService: GCalAuthService) {}

  async getClient(userId: string): Promise<gCalendar> {
    return this.gCalAuthService.getClient(userId);
  }

  async getCalendarlist(gcal: gCalendar) {
    const response = await gcal.calendarList.list();

    if (!response.data.nextSyncToken) {
      throw error(
        GcalError.PaginationNotSupported,
        'Calendarlist sync token not saved',
      );
    }

    if (!response.data.items) {
      throw error(GcalError.CalendarlistMissing, 'gCalendarlist not found');
    }
    return response.data;
  }

  async getEvents(gcal: gCalendar, params: gParamsImportAllEvents) {
    try {
      const response = await gcal.events.list(params);
      return { data: response.data };
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }

  async getEventInstances(
    gcal: gCalendar,
    calendarId: string,
    recurringEventId: string,
    timeMin: string,
    timeMax: string,
  ) {
    try {
      const response = await gcal.events.instances({
        calendarId,
        eventId: recurringEventId,
        timeMin,
        timeMax,
      });
      return { data: response.data };
    } catch (error) {
      console.error('Failed to get event instances:', error);
      throw error;
    }
  }

  async watchEvents(gcal: gCalendar, params: Params_WatchEvents) {
    try {
      const response = await gcal.events.watch({
        calendarId: params.gCalendarId,
        requestBody: {
          id: params.channelId,
          type: 'web_hook',
          address: process.env.GCAL_NOTIFICATION_URL,
          expiration: params.expiration,
        },
      });
      return { watch: response.data };
    } catch (error) {
      console.error('Failed to watch events:', error);
      throw error;
    }
  }

  async stopChannel(gcal: gCalendar, channelId: string, resourceId: string) {
    try {
      const response = await gcal.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: resourceId,
        },
      });
      return response;
    } catch (error) {
      console.error('Failed to stop channel:', error);
      throw error;
    }
  }
}
