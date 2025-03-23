# Recurring Events

## Vocab

- Base Event: The first event in the series.
- Instance Event: A later event in the series.
- Series: A base event and all its instances.
- Recurrence: The rule that describes how the event repeats.

## Guiding Principles

### Always keep track of the original base event id

This id is needed to be able to delete/edit all instances.

Even if a user edits just one instance, they might later want to delete the series

The recurringEventId field helps identify:

- Which instance belongs to which series
- When an instance is modified

### Always keep track of the original start time of an instance

The `originalStartTime` uniquely identifies the instance within the recurring event series even if the instance was moved to a different time

### The presence of UNTIL in recurrence rules indicates (unverified)

- End of current series
- Start of new series

## Payload Comparison

- Change Type: What the user did in Google Calendar
- GET Payload: What is returned from GCal API after the change
- "`_` id": instance id, where the prefix is the base event id and the suffix is the timestamp of the instances
  - For example, a base event with id `123` and instance on `2025-03-23` will have an instance id of `123_20250323T120000Z`

| Change Type        | GET Payload                                                                                | Base Event                                         | Instance Events                                             | Key Differences                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New Recurring      | Base                                                                                       | Single base with `recurrence` rule                 | None                                                        | - Only contains the base<br>- Has `recurrence` rule <br>- No instance events                                                                                     |
| Edit One Instance  | Base + Expanded instances                                                                  | unchanged                                          | - new data<br> - has `_` id<br>- has `recurringEventId`<br> | - Even though only one instance is changed, all instances are returned                                                                                           |
| Edit This & Future | Base1 + <br>(Expanded? instances with `_` id and new data) + <br>Base2 with `Base1Id_R` id | Base event modified                                | Modified instance + new base                                | - Base has `until` rule<br>- Modified instance<br>- New base with new `recurrence` rule<br>- Original base event id is partially reused in the new base event id |
| Edit All Instances | Base1 with new data + <br>Instance1 + <br>Base2 with `_R` id                               | - Same id<br>- new data<br>- `UNTIL` added to rule | ?                                                           | <br>- New base with new `recurrence` rule<br>- All instances updated                                                                                             |

## Implementation Guide

### Key Concepts

1. **Event Identification**

   - Base events have simple IDs (e.g., `123`)
   - Instance events have IDs with timestamps (e.g., `123_20250323T120000Z`)
   - New base events after modifications have `_R` suffix (e.g., `123_R20250323T120000Z`)

2. **Recurrence Rules**

   - RRULE format (e.g., `RRULE:FREQ=WEEKLY`)
   - `UNTIL` rule indicates end of current series
   - When a user modifies "this and future" instances:
     - Original base event gets an `UNTIL` rule ending before the modified instance
     - New base event is created with `_R` suffix in ID
     - Modified instance is included in payload

3. **Tracking Relationships**
   - `recurringEventId` links instances to their base event
   - `originalStartTime` preserves instance's original schedule
   - `iCalUID` remains constant across modifications

### Handling Different Scenarios

#### 1. Creating a New Recurring Event

```typescript
// Payload contains single base event with recurrence rule
const newRecurringEvent = {
  id: "123",
  summary: "Weekly Meeting",
  recurrence: ["RRULE:FREQ=WEEKLY"],
  start: { dateTime: "2025-03-23T10:00:00Z" },
  end: { dateTime: "2025-03-23T11:00:00Z" },
};

// Implementation steps:
async function handleNewRecurringEvent(event: gSchema$Event) {
  // 1. Store base event
  await storeBaseEvent(event);

  // 2. Expand instances for next 6 months
  const instances = await expandRecurringEvent(
    event.id,
    event.start.dateTime,
    dayjs().add(6, "months").toISOString(),
  );

  // 3. Store all instances
  await storeInstances(instances);
}
```

#### 2. Editing One Instance

```typescript
// Payload contains base event and modified instance
const modifiedInstance = {
  id: "123_20250323T120000Z",
  recurringEventId: "123",
  summary: "Modified Meeting",
  originalStartTime: { dateTime: "2025-03-23T10:00:00Z" },
};

// Implementation steps:
async function handleSingleInstanceEdit(instance: gSchema$Event) {
  // 1. Update only the modified instance
  await updateEvent({
    gEventId: instance.id,
    recurringEventId: instance.recurringEventId,
    originalStartTime: instance.originalStartTime,
    // ... other modified fields
  });

  // 2. Keep base event and other instances unchanged
}
```

#### 3. Editing This and Future Instances

```typescript
// Payload contains:
// 1. Original base event with UNTIL rule
// 2. Modified instance
// 3. New base event with _R suffix
const originalBase = {
  id: "123",
  recurrence: ["RRULE:FREQ=WEEKLY;UNTIL=20250322T235959Z"],
};

const newBase = {
  id: "123_R20250323T120000Z",
  recurrence: ["RRULE:FREQ=WEEKLY"],
  start: { dateTime: "2025-03-23T10:00:00Z" },
};

// Implementation steps:
async function handleThisAndFutureEdit(
  originalBase: gSchema$Event,
  modifiedInstance: gSchema$Event,
  newBase: gSchema$Event,
) {
  // 1. Delete instances from modified date forward
  await deleteFutureInstances(originalBase.id, modifiedInstance.start.dateTime);

  // 2. Create new base event
  await storeBaseEvent(newBase);

  // 3. Expand new instances from modified date
  const newInstances = await expandRecurringEvent(
    newBase.id,
    newBase.start.dateTime,
    dayjs().add(6, "months").toISOString(),
  );

  // 4. Store new instances
  await storeInstances(newInstances);
}
```

#### 4. Editing All Instances

```typescript
// Payload contains:
// 1. Modified base event
// 2. New base event with _R suffix
const modifiedBase = {
  id: "123",
  summary: "Updated Weekly Meeting",
  recurrence: ["RRULE:FREQ=WEEKLY;UNTIL=20250322T235959Z"],
};

const newBase = {
  id: "123_R20250323T120000Z",
  summary: "Updated Weekly Meeting",
  recurrence: ["RRULE:FREQ=WEEKLY"],
};

// Implementation steps:
async function handleAllInstancesEdit(
  modifiedBase: gSchema$Event,
  newBase: gSchema$Event,
) {
  // 1. Delete all existing instances
  await deleteAllInstances(modifiedBase.id);

  // 2. Create new base event
  await storeBaseEvent(newBase);

  // 3. Expand new instances
  const newInstances = await expandRecurringEvent(
    newBase.id,
    newBase.start.dateTime,
    dayjs().add(6, "months").toISOString(),
  );

  // 4. Store new instances
  await storeInstances(newInstances);
}
```

### Best Practices

1. **Always Track Original IDs**

   - Store `recurringEventId` for all instances
   - Keep `originalStartTime` for modified instances
   - Use `iCalUID` for cross-referencing

2. **Handle Series Modifications**

   - Check for `UNTIL` rules to identify series endings
   - Look for `_R` suffix in IDs for new series
   - Preserve original series data until new series is confirmed

3. **Instance Management**

   - Use `originalStartTime` for instance identification
   - Keep track of modified instances separately
   - Handle timezone conversions consistently

4. **Error Handling**

   - Validate recurrence rules
   - Handle missing or malformed data gracefully
   - Maintain data consistency across modifications

5. **Performance Considerations**
   - Limit instance expansion to reasonable time windows
   - Batch database operations
   - Cache frequently accessed series data
