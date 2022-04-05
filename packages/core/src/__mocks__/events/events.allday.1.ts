// all day events, without some normal properties
export const allDayEventsMinimal = [
  {
    _id: "6202cf7c0380e5a68fde09fc",
    title: "llama",
    isAllDay: true,
    startDate: "2022-02-11",
    endDate: "2022-02-13",
  },
  {
    _id: "6202cf7c0380e5a68fde09fe",
    title: "tiger",
    isAllDay: true,
    startDate: "2022-02-10",
    endDate: "2022-02-11",
  },
  //02-08
  {
    _id: "6202cf7c0380e5a68fde0a01",
    origin: "googleimport",
    title: "test5",
    description: "",
    isAllDay: true,
    startDate: "2022-02-08",
    endDate: "2022-02-08",
  },
  {
    _id: "6202e4930380e5a68fde0a0e",
    isAllDay: true,
    startDate: "2022-02-08",
    endDate: "2022-02-08",
    title: "test1",
  },
  {
    _id: "6202cf7c0380e5a68fde0a02",
    title: "test3duplicate",
    isAllDay: true,
    startDate: "2022-02-08",
    endDate: "2022-02-08",
  },
  {
    _id: "6202e47b0380e5a68fde0a0d",
    isAllDay: true,
    startDate: "2022-02-08",
    endDate: "2022-02-08",
    title: "test2",
  },
  {
    _id: "6202cf7c0380e5a68fde0a0a",
    title: "test3duplicate",
    isAllDay: true,
    startDate: "2022-02-08",
    endDate: "2022-02-08",
  },
  //other
  {
    _id: "6202cf7c0380e5a68fde0a06",
    title: "trex",
    isAllDay: true,
    startDate: "2022-02-09",
    endDate: "2022-02-10",
  },
  {
    _id: "6202d0970380e5a68fde0a0c",
    isAllDay: true,
    startDate: "2022-02-09",
    endDate: "2022-02-09",
    title: "0 ride",
  },
  {
    _id: "6202e51d0380e5a68fde0a10",
    isAllDay: true,
    startDate: "2022-02-09",
    endDate: "2022-02-09",
    title: "xyz",
  },
];

export const staggeredAllDayEvents = [
  {
    _id: "abmbm",
    title: "Feb 24 - Feb 28",
    isAllDay: true,
    startDate: "2022-02-24",
    endDate: "2022-03-01",
  },
  {
    _id: "kkdbm",
    title: "Feb 26 ",
    isAllDay: true,
    startDate: "2022-02-26",
    endDate: "2022-02-27",
  },
  {
    _id: "621928f4b6d2f2affe5a4942",
    title: "Feb 26 - Feb 28",
    isAllDay: true,
    startDate: "2022-02-26",
    endDate: "2022-02-28",
  },
  {
    _id: "621928f4b6d2f2affe5a4943",
    title: "foo2",
    isAllDay: true,
    startDate: "2022-02-25",
    endDate: "2022-02-26",
  },
  {
    _id: "621928f4b6d2f2affe5a4945",
    title: "foo3",
    isAllDay: true,
    startDate: "2022-02-02",
    endDate: "2022-02-24",
  },
];

/*
11  12  13  14  15  16 
    ----------
    --
------------------>
*/
export const staggeredWithMultiWeek = [
  {
    _id: "id1",
    title: "multiple days",
    isAllDay: true,
    allDayOrder: 2,
    startDate: "2022-03-12",
    endDate: "2022-03-15",
    priority: "work",
  },
  {
    _id: "id2",
    title: "1 day",
    allDayOrder: 2,
    isAllDay: true,
    startDate: "2022-03-12",
    endDate: "2022-03-13",
    priority: "work",
  },
  {
    _id: "id3",
    allDayOrder: 1,
    title: "Multi-Week Event",
    isAllDay: true,
    startDate: "2022-03-11",
    endDate: "2022-05-05",
  },
];
