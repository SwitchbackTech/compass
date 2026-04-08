import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { brighten, darken } from "@core/util/color.utils";
import {
  FREQUENCY_MAP,
  FREQUENCY_OPTIONS,
  type FrequencyValues,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";
import {
  StyledFreqSelectContainer,
  StyledFreqSelectListbox,
  StyledFreqSelectOption,
  StyledFreqSelectTrigger,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";

export interface FreqSelectProps {
  bgColor: string;
  value: FrequencyValues;
  plural?: boolean;
  onFreqSelect: (option: FrequencyValues) => void;
}

const LISTBOX_ID = "freq-select-listbox";

const getOptionId = (index: number) => `freq-select-option-${index}`;

export const FreqSelect = ({
  bgColor,
  value,
  plural = false,
  onFreqSelect,
}: FreqSelectProps) => {
  const options = useMemo(() => FREQUENCY_OPTIONS(plural ? "s" : ""), [plural]);
  const bgBright = brighten(bgColor);
  const bgDark = darken(bgColor);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typeaheadBufferRef = useRef("");

  const selectedIndex = useMemo(
    () => options.findIndex((opt) => opt.value === value),
    [options, value],
  );

  const label = useMemo(
    () => `${FREQUENCY_MAP[value]}${plural ? "s" : ""}`,
    [value, plural],
  );

  const openListbox = useCallback(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }, [selectedIndex]);

  const closeListbox = useCallback(
    (shouldRestoreFocus = true) => {
      setIsOpen(false);
      setActiveIndex(-1);
      if (shouldRestoreFocus) {
        triggerRef.current?.focus();
      }
    },
    [],
  );

  const selectOption = useCallback(
    (index: number) => {
      const option = options[index];
      if (option) {
        onFreqSelect(option.value as FrequencyValues);
      }
      closeListbox();
    },
    [options, onFreqSelect, closeListbox],
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        listboxRef.current &&
        !listboxRef.current.contains(target)
      ) {
        closeListbox(true);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, closeListbox]);

  // Focus the listbox when it opens so it captures keyboard events
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      listboxRef.current.focus();
    }
  }, [isOpen]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case " ":
      case "Enter":
      case "ArrowDown":
        if (e.key === "ArrowDown" && !e.altKey && isOpen) break;
        e.preventDefault();
        e.stopPropagation();
        if (!isOpen) {
          openListbox();
        }
        break;
      case "ArrowUp":
        if (e.altKey && isOpen) {
          e.preventDefault();
          e.stopPropagation();
          closeListbox();
        }
        break;
      default:
        break;
    }
  };

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    const optionCount = options.length;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        if (e.altKey) break;
        setActiveIndex((prev) => (prev + 1) % optionCount);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (e.altKey) {
          closeListbox();
          break;
        }
        setActiveIndex(
          (prev) => (prev - 1 + optionCount) % optionCount,
        );
        break;
      }
      case "Home":
      case "PageUp": {
        e.preventDefault();
        setActiveIndex(0);
        break;
      }
      case "End":
      case "PageDown": {
        e.preventDefault();
        setActiveIndex(optionCount - 1);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (activeIndex >= 0) {
          selectOption(activeIndex);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        closeListbox();
        break;
      }
      case "Tab": {
        closeListbox();
        break;
      }
      default: {
        // Typeahead: single character jumps to matching option
        if (e.key.length === 1) {
          e.preventDefault();
          typeaheadBufferRef.current += e.key.toLowerCase();

          if (typeaheadTimeoutRef.current) {
            clearTimeout(typeaheadTimeoutRef.current);
          }

          typeaheadTimeoutRef.current = setTimeout(() => {
            typeaheadBufferRef.current = "";
          }, 500);

          const matchIndex = options.findIndex((opt) =>
            opt.label.toLowerCase().startsWith(typeaheadBufferRef.current),
          );

          if (matchIndex >= 0) {
            setActiveIndex(matchIndex);
          }
        }
        break;
      }
    }
  };

  return (
    <StyledFreqSelectContainer>
      <StyledFreqSelectTrigger
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={LISTBOX_ID}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? getOptionId(activeIndex) : undefined
        }
        aria-label="Recurrence frequency"
        bgColor={bgColor}
        onClick={() => {
          if (isOpen) {
            closeListbox();
          } else {
            openListbox();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{label}</span>
        {isOpen ? <CaretUp size={12} /> : <CaretDown size={12} />}
      </StyledFreqSelectTrigger>

      {isOpen && (
        <StyledFreqSelectListbox
          ref={listboxRef}
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Recurrence frequency options"
          bgColor={bgColor}
          onKeyDown={handleListboxKeyDown}
          tabIndex={-1}
        >
          {options.map((option, index) => (
            <StyledFreqSelectOption
              key={option.value}
              id={getOptionId(index)}
              role="option"
              aria-selected={option.value === value}
              bgColor={bgColor}
              bgBright={bgBright}
              bgDark={bgDark}
              isActive={index === activeIndex}
              isSelected={option.value === value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectOption(index);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.label}
            </StyledFreqSelectOption>
          ))}
        </StyledFreqSelectListbox>
      )}
    </StyledFreqSelectContainer>
  );
};
