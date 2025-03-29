import dayjs from "dayjs";
import { generateRecurrenceDates } from "./utils";

describe("generateRecurrenceDates", () => {
  const baseEvent = {
    startDate: "2024-01-15T09:00:00.000Z", // Monday
    endDate: "2024-01-15T10:00:00.000Z",
  };

  it("returns empty array when no weekdays are selected", () => {
    const result = generateRecurrenceDates({
      event: baseEvent,
      repeatCount: 2,
      weekDays: [],
    });

    expect(result).toEqual([]);
  });

  it("generates correct dates for single weekday", () => {
    const result = generateRecurrenceDates({
      event: baseEvent,
      repeatCount: 2,
      weekDays: ["monday"],
    });

    expect(result).toHaveLength(2);
    expect(result.map((d) => dayjs(d.startDate).format("YYYY-MM-DD"))).toEqual([
      "2024-01-15", // First Monday
      "2024-01-22", // Second Monday
    ]);
  });

  it("generates correct dates for multiple weekdays", () => {
    const result = generateRecurrenceDates({
      event: baseEvent,
      repeatCount: 2,
      weekDays: ["monday", "wednesday", "friday"],
    });

    expect(result).toHaveLength(6);
    expect(result.map((d) => dayjs(d.startDate).format("YYYY-MM-DD"))).toEqual([
      "2024-01-15", // First Monday
      "2024-01-17", // First Wednesday
      "2024-01-19", // First Friday
      "2024-01-22", // Second Monday
      "2024-01-24", // Second Wednesday
      "2024-01-26", // Second Friday
    ]);
  });

  it("handles weekend days correctly", () => {
    const weekendEvent = {
      startDate: "2024-01-20T09:00:00.000Z", // Saturday
      endDate: "2024-01-20T10:00:00.000Z",
    };

    const result = generateRecurrenceDates({
      event: weekendEvent,
      repeatCount: 2,
      weekDays: ["saturday", "sunday"],
    });

    expect(result).toHaveLength(4);
    expect(result.map((d) => dayjs(d.startDate).format("YYYY-MM-DD"))).toEqual([
      "2024-01-20", // First Saturday
      "2024-01-21", // First Sunday
      "2024-01-27", // Second Saturday
      "2024-01-28", // Second Sunday
    ]);
  });
});
