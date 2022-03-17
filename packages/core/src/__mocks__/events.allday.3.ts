/*
13  14  15  16  17  18  19
--
------                    
--  ------  --     --    --
0   1   2   3       5   6

let rows = 1
let eventsSoFar = [ [03-23, 04-11], [03-23, 03,24] ]
for (event, index) in events:
    if (index === 0)
        event.row = 1 
        return

    const anyOverlaps = (event, eventsSoFar) => 
        for e in eventsSoFar
            if event.start.isBetween(e[0], e[1]) || event.end.isBetween(e[0], e[1])
                return true
        return false

    if (anyOverlaps)
        rows += 1

    event.row = rows


13  14  15  16  17  18  19
    --  ------
    ----------
    --------------
    ---------------------->
    --  --  --  
--------------  --

*/
export const allDayManyOverlaps = [
  {
    _id: "62322b127837957382660240",
    gEventId: "sqs4bgu2i16ej51p84s2ufmsfg",
    user: "6227e1a1623abad10d70afbf",
    origin: "googleimport",
    title: "abudk",
    description: "",
    priorities: [],
    isAllDay: true,
    startDate: "2022-03-14",
    endDate: "2022-03-14",
    priority: "work",
  },
  {
    _id: "62322b127837957382660240",
    gEventId: "sqs4bgu2i16ej51p84s2ufmsfg",
    user: "6227e1a1623abad10d70afbf",
    origin: "googleimport",
    title: "mins",
    description: "",
    priorities: [],
    isAllDay: true,
    startDate: "2022-03-14",
    endDate: "2022-03-17",
    priority: "work",
  },

  {
    _id: "62322b127837957382660241",
    gEventId: "6unof6mvr61mtldejqctdtq8t7",
    user: "6227e1a1623abad10d70afbf",
    origin: "googleimport",
    title: "CO -> MN long title long ",
    description: "",
    priorities: [],
    isAllDay: true,
    startDate: "2022-03-14",
    endDate: "2022-03-15",
    priority: "work",
  },
  {
    _id: "62322b127837957382660242",
    gEventId: "4mlodbbda9lhr59lmsjlnmlhtb",
    user: "6227e1a1623abad10d70afbf",
    origin: "googleimport",
    title: "z9-13",
    description: "",
    priorities: [],
    isAllDay: true,
    startDate: "2022-03-14",
    endDate: "2022-03-17",
    priority: "work",
  },
  {
    _id: "62322b127837957382660243",
    gEventId: "4102i9el29rbj9s9bqq5qa9su4",
    user: "6227e1a1623abad10d70afbf",
    origin: "googleimport",
    title: "x0311-0321",
    description: "",
    priorities: [],
    isAllDay: true,
    startDate: "2022-03-14",
    endDate: "2022-03-22",
    priority: "work",
  },
  {
    _id: "62322b127837957382660245",
    gEventId: "688ics7s7d2glh6tl95tsn7451",
    user: "6227e1a1623abad10d70afbf",
    origin: "googleimport",
    title: "Ski Wolf Creek",
    description: "",
    priorities: [],
    isAllDay: true,
    startDate: "2022-03-15",
    endDate: "2022-03-17",
    priority: "work",
  },
  {
    _id: "62322fed7837957382660247",
    priority: "self",
    isAllDay: true,
    startDate: "2022-03-17",
    endDate: "2022-03-17",
    title: "no intercept",
    origin: "compass",
    user: "6227e1a1623abad10d70afbf",
    gEventId: "s21dh506838p4ucfv9s30nnr68",
  },
  {
    _id: "62322ff67837957382660248",
    priority: "work",
    isAllDay: true,
    startDate: "2022-03-16",
    endDate: "2022-03-16",
    title: "monu",
    origin: "compass",
    user: "6227e1a1623abad10d70afbf",
    gEventId: "t71dktc43tfuvgr0b9e3c3a0ik",
  },
  {
    _id: "623230157837957382660249",
    priority: "work",
    isAllDay: true,
    startDate: "2022-03-15",
    endDate: "2022-03-15",
    title: "scoop",
    origin: "compass",
    user: "6227e1a1623abad10d70afbf",
    gEventId: "6qcb9mpop2dl33g0e5315b5mr8",
  },
];
