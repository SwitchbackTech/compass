const events = [
  { gEventId: '123', otherProp: 123 },
  { gEventId: '123', otherProp: 129 },
];

test('adds 1 + 2 to equal 3', () => {
  const ids = events.map((e) => e.gEventId);
  console.log(ids);
});
