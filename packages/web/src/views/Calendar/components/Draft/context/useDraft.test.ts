import { act } from "react";
import { renderHook } from "@testing-library/react";
import { Schema_Event } from "@core/types/event.types";
import {
  draft$,
  setDraft,
  useDraft,
} from "@web/views/Calendar/components/Draft/context/useDraft";

describe("useDraft", () => {
  const mockEvent: Schema_Event = {
    _id: "123",
    title: "Test Event",
    startDate: "2023-01-01",
    endDate: "2023-01-01",
  };

  beforeEach(() => {
    // Reset the subject before each test
    draft$.next(null);
  });

  it("should return null initially", () => {
    const { result } = renderHook(() => useDraft());
    expect(result.current).toBeNull();
  });

  it("should update when setDraft is called", () => {
    const { result } = renderHook(() => useDraft());

    act(() => {
      setDraft(mockEvent);
    });

    expect(result.current).toEqual(mockEvent);
  });

  it("should update when draft$ subject emits", () => {
    const { result } = renderHook(() => useDraft());

    act(() => {
      draft$.next(mockEvent);
    });

    expect(result.current).toEqual(mockEvent);
  });

  it("should handle setting draft to null", () => {
    const { result } = renderHook(() => useDraft());

    act(() => {
      setDraft(mockEvent);
    });
    expect(result.current).toEqual(mockEvent);

    act(() => {
      setDraft(null);
    });
    expect(result.current).toBeNull();
  });
});
