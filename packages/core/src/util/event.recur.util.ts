import { datetime, RRule, RRuleSet, rrulestr } from "rrule";

export const getRecurrenceText = (rule: RRule) => {
  const text = rule.toText();
  const f = rule.all();
  return text;
};
