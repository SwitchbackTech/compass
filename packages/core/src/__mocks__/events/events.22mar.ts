const allDayEventsThatShouldMatch =
  // ordered by start date
  [
    {
      _id: "777777c12807744e27c13616",
      user: "user1",
      title: "Feb 22",
      isAllDay: false,
      isSomeday: false,
      startDate: "2022-02",
    },
    {
      _id: "623defc12807744e27c13616",
      user: "user1",
      title: "Feb 14 - Mar 8",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-02-14",
      endDate: "2022-03-08",
    },
    {
      _id: "623defc12807744e27c1361e",
      user: "user1",
      title: "Mar 8",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-03-08",
      endDate: "2022-03-09",
    },
    {
      _id: "623defc02807744e27c1353c",
      user: "user1",
      title: "Mar 10 - 12",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-03-10",
      endDate: "2022-03-13",
      priority: "work",
    },
  ];

const allDayEventsThatShouldNotMatch = [
  {
    _id: "623defc12807744e27c1363z",
    user: "user1",
    title: "Feb 28 - Mar 5",
    isAllDay: true,
    isSomeday: false,
    startDate: "2022-02-28",
    endDate: "2022-03-05",
    priority: "work",
  },
  {
    _id: "623defc12807744e27c13638",
    user: "user1",
    title: "Mar 5",
    isAllDay: true,
    isSomeday: false,
    startDate: "2022-03-05",
    endDate: "2022-03-06",
    priority: "work",
  },
  {
    _id: "623defc12807744e27c13649",
    user: "user1",
    title: "Mar 13",
    isAllDay: true,
    isSomeday: false,
    startDate: "2022-03-13",
    endDate: "2022-03-14",
    priority: "work",
  },
  {
    _id: "623defc12807744e27c13632",
    user: "user1",
    title: "Mar 13 - 16",
    isAllDay: true,
    isSomeday: false,
    startDate: "2022-03-13",
    endDate: "2022-03-17",
    priority: "work",
  },
];

export const mockEventSetMar22 = [
  ...allDayEventsThatShouldMatch,
  ...allDayEventsThatShouldNotMatch,
];
