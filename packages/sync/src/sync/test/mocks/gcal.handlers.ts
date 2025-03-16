import { rest } from 'msw';

export const gcalHandlers = [
  rest.post(
    'https://www.googleapis.com/calendar/v3/calendars/:calendarId/events/watch',
    async (req, res, ctx) => {
      return res(
        ctx.json({
          kind: 'api#channel',
          resourceId: 'test-resource-id',
          channelId: await req.text(),
        }),
      );
    },
  ),
];
