import React, {
  ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { ID_REMINDER_INPUT } from "@web/common/constants/web.constants";
import { useKeyDownEvent } from "@web/common/hooks/useKeyboardEvent";
import { theme } from "@web/common/styles/theme";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectReminder } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { generateHandDrawnUnderline } from "@web/views/Calendar/components/Header/Reminder/reminder-util";
import {
  StyledCharCounter,
  StyledPlaceholderUnderline,
  StyledReminderContainer,
  StyledReminderPlaceholder,
  StyledReminderText,
  StyledReminderWrapper,
  StyledUnderline,
} from "./styled";

const MAX_REMINDER_CHARS = 80;

type CursorPosition = {
  startOffset: number;
  endOffset: number;
};

export const Reminder = forwardRef(
  (
    _: unknown,
    reminderForwardRef: ForwardedRef<{ focus: HTMLDivElement["focus"] }>,
  ) => {
    const reminderFromStore = useAppSelector(selectReminder);
    const dispatch = useAppDispatch();
    const [reminder, setReminder] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [showUnderline, setShowUnderline] = useState(false);
    const [showPlaceholderUnderline, setShowPlaceholderUnderline] =
      useState(false);
    const [underlinePath, setUnderlinePath] = useState("");
    const [placeholderUnderlinePath, setPlaceholderUnderlinePath] =
      useState("");
    const reminderRef = useRef<HTMLDivElement>(null);
    const reminderWrapperRef = useRef<HTMLDivElement>(null);
    const placeholderRef = useRef<HTMLDivElement>(null);
    const cursorPositionRef = useRef<CursorPosition | null>(null);

    // Helper functions to save and restore cursor position
    const saveCursorPosition = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !reminderRef.current)
        return;

      const range = selection.getRangeAt(0);
      if (reminderRef.current.contains(range.commonAncestorContainer)) {
        cursorPositionRef.current = {
          startOffset: range.startOffset,
          endOffset: range.endOffset,
        };
      }
    };

    const restoreCursorPosition = () => {
      if (!cursorPositionRef.current || !reminderRef.current) return;

      const selection = window.getSelection();
      if (!selection) return;

      try {
        const range = document.createRange();
        const textNode = reminderRef.current.firstChild || reminderRef.current;

        // Ensure offsets are within the valid range
        const textLength = textNode.textContent?.length || 0;
        const startOffset = Math.min(
          cursorPositionRef.current.startOffset,
          textLength,
        );
        const endOffset = Math.min(
          cursorPositionRef.current.endOffset,
          textLength,
        );

        range.setStart(textNode, startOffset);
        range.setEnd(textNode, endOffset);

        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        console.error("Failed to restore cursor position", e);
      }
    };

    // Load from localStorage on mount
    useEffect(() => {
      const savedReminder = localStorage.getItem(STORAGE_KEYS.REMINDER);
      if (savedReminder !== null) {
        setReminder(savedReminder);
      }
    }, []);

    // Generate underline paths when components mount or resize
    useEffect(() => {
      if (reminderWrapperRef.current) {
        const width = reminderWrapperRef.current.offsetWidth;
        setUnderlinePath(generateHandDrawnUnderline(width));
      }

      if (placeholderRef.current) {
        const width = placeholderRef.current.offsetWidth;
        setPlaceholderUnderlinePath(generateHandDrawnUnderline(width));
      }

      // Add resize listener
      const handleResize = () => {
        if (reminderWrapperRef.current) {
          const width = reminderWrapperRef.current.offsetWidth;
          setUnderlinePath(generateHandDrawnUnderline(width));
        }

        if (placeholderRef.current) {
          const width = placeholderRef.current.offsetWidth;
          setPlaceholderUnderlinePath(generateHandDrawnUnderline(width));
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [reminder, isEditing]);

    // Regenerate underline on hover for a dynamic effect
    const handleMouseEnter = () => {
      if (reminderWrapperRef.current) {
        const width = reminderWrapperRef.current.offsetWidth;
        setUnderlinePath(generateHandDrawnUnderline(width));
        setShowUnderline(true);
      }
    };

    const handlePlaceholderMouseEnter = () => {
      if (placeholderRef.current) {
        const width = placeholderRef.current.offsetWidth;
        setPlaceholderUnderlinePath(generateHandDrawnUnderline(width));
        setShowPlaceholderUnderline(true);
      }
    };

    // Effect for initial focus when editing starts
    useEffect(() => {
      if (isEditing && reminderRef.current) {
        // Only set content when first entering edit mode
        if (reminderRef.current.textContent !== reminder) {
          reminderRef.current.textContent = reminder;
        }
        reminderRef.current.focus();

        // Only place cursor at the end when first entering edit mode
        if (!cursorPositionRef.current) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(reminderRef.current);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } else {
          // Restore previously saved cursor position
          restoreCursorPosition();
        }
      }
    }, [isEditing]);

    // Effect to sync reminder content after state updates
    useEffect(() => {
      if (
        isEditing &&
        reminderRef.current &&
        reminderRef.current.textContent !== reminder
      ) {
        // Remember cursor position
        saveCursorPosition();

        // Update text content only if it's different
        if (reminderRef.current.textContent !== reminder) {
          reminderRef.current.textContent = reminder;
        }

        // Restore cursor position
        setTimeout(restoreCursorPosition, 0);
      }
    }, [reminder, isEditing]);

    const handleEscKey = useCallback(() => {
      if (isEditing) {
        setIsEditing(false);
        // Save to localStorage on ESC
        if (reminderRef.current) {
          const value = reminderRef.current.textContent || "";
          setReminder(value);
          localStorage.setItem(STORAGE_KEYS.REMINDER, value);
        }
      }
    }, [isEditing]);

    // Effect to handle ESC key
    useKeyDownEvent({
      combination: ["Escape"],
      listenWhileEditing: true,
      handler: handleEscKey,
    });

    useKeyDownEvent({
      combination: ["Esc"],
      listenWhileEditing: true,
      handler: handleEscKey,
    });

    const handleReminderClick = () => {
      cursorPositionRef.current = null; // Reset cursor position
      setIsEditing(true);
    };

    useImperativeHandle(
      reminderForwardRef,
      () => ({ focus: handleReminderClick }),
      [handleReminderClick],
    );

    useEffect(() => {
      if (reminderFromStore) handleReminderClick();

      dispatch(viewSlice.actions.updateReminder(false));
    }, [reminderFromStore]);

    const handleReminderBlur = () => {
      setIsEditing(false);
      // Save to localStorage on blur
      if (reminderRef.current) {
        const value = reminderRef.current.textContent || "";
        setReminder(value);
        localStorage.setItem(STORAGE_KEYS.REMINDER, value);
      }
    };

    const handleReminderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation(); // Prevent the Enter key from bubbling up to global shortcuts
        // Blur the input immediately to prevent global Enter handlers from firing
        e.currentTarget.blur();
        setIsEditing(false);
        // Save to localStorage on ENTER
        const latestValue = e.currentTarget.textContent || "";
        setReminder(latestValue);
        localStorage.setItem(STORAGE_KEYS.REMINDER, latestValue);
      }
    };

    const handleReminderChange = (e: React.FormEvent<HTMLDivElement>) => {
      const newText = e.currentTarget.textContent || "";

      // Save cursor position before updating state
      saveCursorPosition();

      // Limit text length
      if (newText.length <= MAX_REMINDER_CHARS) {
        setReminder(newText);
      } else {
        // If text is too long, truncate it and update the DOM element
        const truncated = newText.substring(0, MAX_REMINDER_CHARS);
        setReminder(truncated);

        // Only manually update DOM and cursor if truncation happened
        if (newText !== truncated) {
          e.currentTarget.textContent = truncated;

          // Place cursor at the end after truncating
          const range = document.createRange();
          const sel = window.getSelection();
          if (sel) {
            range.selectNodeContents(e.currentTarget);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

            // Update saved cursor position
            cursorPositionRef.current = {
              startOffset: truncated.length,
              endOffset: truncated.length,
            };
          }
        }
      }
    };

    return (
      <StyledReminderContainer>
        {isEditing ? (
          <>
            <StyledReminderWrapper ref={reminderWrapperRef}>
              <StyledReminderText
                id={ID_REMINDER_INPUT}
                ref={reminderRef}
                contentEditable
                suppressContentEditableWarning
                isEditing={true}
                textLength={reminder.length}
                onBlur={handleReminderBlur}
                onKeyDown={handleReminderKeyDown}
                onInput={handleReminderChange}
              />
            </StyledReminderWrapper>
            <StyledCharCounter
              isNearLimit={reminder.length > MAX_REMINDER_CHARS * 0.8}
            >
              {reminder.length}/{MAX_REMINDER_CHARS}
            </StyledCharCounter>
          </>
        ) : reminder ? (
          <TooltipWrapper
            description="Edit Reminder"
            onClick={() => {}}
            shortcut="R"
          >
            <StyledReminderWrapper
              ref={reminderWrapperRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={() => setShowUnderline(false)}
            >
              <StyledReminderText
                isEditing={false}
                textLength={reminder.length}
                onClick={handleReminderClick}
              >
                {reminder}
              </StyledReminderText>
              <StyledUnderline
                isVisible={showUnderline}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="underlineGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor={theme.color.gradient.accentLight.start}
                    />
                    <stop
                      offset="100%"
                      stopColor={theme.color.gradient.accentLight.end}
                    />
                  </linearGradient>
                </defs>
                <path d={underlinePath} stroke="url(#underlineGradient)" />
              </StyledUnderline>
            </StyledReminderWrapper>
          </TooltipWrapper>
        ) : (
          <TooltipWrapper
            description="Edit Reminder"
            onClick={() => {}}
            shortcut="R"
          >
            <StyledReminderWrapper
              ref={placeholderRef}
              onMouseEnter={handlePlaceholderMouseEnter}
              onMouseLeave={() => setShowPlaceholderUnderline(false)}
            >
              <StyledReminderPlaceholder onClick={handleReminderClick}>
                Click to add your reminder
              </StyledReminderPlaceholder>
              <StyledPlaceholderUnderline
                isVisible={showPlaceholderUnderline}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="placeholderUnderlineGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor={theme.color.gradient.accentLight.start}
                    />
                    <stop
                      offset="100%"
                      stopColor={theme.color.gradient.accentLight.end}
                    />
                  </linearGradient>
                </defs>
                <path
                  d={placeholderUnderlinePath}
                  stroke="url(#placeholderUnderlineGradient)"
                />
              </StyledPlaceholderUnderline>
            </StyledReminderWrapper>
          </TooltipWrapper>
        )}
      </StyledReminderContainer>
    );
  },
);

Reminder.displayName = "Reminder";
