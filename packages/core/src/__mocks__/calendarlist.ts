export const compassCalendarList = {
  user: "auserid",
  google: {
    nextSyncToken: "calendarListSyncToken",
    items: [
      {
        id: "27th kdkdkdkkd",
        summary: "My Primary",
        description: "hardCoded testing",
        sync: {
          channelId: "channel1",
          resourceId: "resource1",
          nextSyncToken: "883838jjjj",
          expiration: "somestring",
        },
      },
      {
        primary: true, // this doesnt appear for all non-primary cals
        id: "27th iiiiiii",
        summary: "27th work",
        description: "just work stuff here",
        sync: {
          channelId: "channel2",
          resourceId: "resource2",
          nextSyncToken: "bnamske",
          expiration: "string2",
        },
      },
    ],
  },
};
