import { Injectable } from '@nestjs/common';
import { gCalendar, gParamsImportAllEvents } from '../types/gcal';
import { Params_WatchEvents } from 'src/types/sync.types';
import { GCalAuthService } from './gcal.auth.service';

@Injectable()
export class GCalService {
  constructor(private readonly gCalAuthService: GCalAuthService) {}

  async getClient(userId: string): Promise<gCalendar> {
    return this.gCalAuthService.getClient(userId);
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
