import { useEffect, useRef, useState } from "react";
import React from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { ID_HEADER_NOTE_INPUT } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { generateHandDrawnUnderline } from "./header-note.util";
import {
  StyledCharCounter,
  StyledNoteContainer,
  StyledNotePlaceholder,
  StyledNoteText,
  StyledNoteWrapper,
  StyledPlaceholderUnderline,
  StyledUnderline,
} from "./styled";

const MAX_NOTE_CHARS = 80;

export const HeaderNote = () => {
  const [note, setNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [showUnderline, setShowUnderline] = useState(false);
  const [showPlaceholderUnderline, setShowPlaceholderUnderline] =
    useState(false);
  const [underlinePath, setUnderlinePath] = useState("");
  const [placeholderUnderlinePath, setPlaceholderUnderlinePath] = useState("");
  const focusRef = useRef<HTMLDivElement>(null);
  const focusWrapperRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedNote = localStorage.getItem(STORAGE_KEYS.HEADER_NOTE);
    if (savedNote !== null) {
      setNote(savedNote);
    }
  }, []);

  // Generate underline paths when components mount or resize
  useEffect(() => {
    if (focusWrapperRef.current) {
      const width = focusWrapperRef.current.offsetWidth;
      setUnderlinePath(generateHandDrawnUnderline(width));
    }

    if (placeholderRef.current) {
      const width = placeholderRef.current.offsetWidth;
      setPlaceholderUnderlinePath(generateHandDrawnUnderline(width));
    }

    // Add resize listener
    const handleResize = () => {
      if (focusWrapperRef.current) {
        const width = focusWrapperRef.current.offsetWidth;
        setUnderlinePath(generateHandDrawnUnderline(width));
      }

      if (placeholderRef.current) {
        const width = placeholderRef.current.offsetWidth;
        setPlaceholderUnderlinePath(generateHandDrawnUnderline(width));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [note, isEditing]);

  // Regenerate underline on hover for a dynamic effect
  const handleMouseEnter = () => {
    if (focusWrapperRef.current) {
      const width = focusWrapperRef.current.offsetWidth;
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

  // Effect for focus editing
  useEffect(() => {
    if (isEditing && focusRef.current) {
      // Set content to current note value when entering edit mode
      focusRef.current.textContent = note;
      focusRef.current.focus();

      // Place cursor at the end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(focusRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing, note]);

  // Effect to handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditing) {
        setIsEditing(false);
        // Save to localStorage on ESC
        if (focusRef.current) {
          const value = focusRef.current.textContent || "";
          setNote(value);
          localStorage.setItem(STORAGE_KEYS.HEADER_NOTE, value);
        }
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isEditing]);

  const handleNoteClick = () => {
    setIsEditing(true);
  };

  const handleNoteBlur = () => {
    setIsEditing(false);
    // Save to localStorage on blur
    if (focusRef.current) {
      const value = focusRef.current.textContent || "";
      setNote(value);
      localStorage.setItem(STORAGE_KEYS.HEADER_NOTE, value);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsEditing(false);
      // Save to localStorage on ENTER
      const latestValue = e.currentTarget.textContent || "";
      setNote(latestValue);
      localStorage.setItem(STORAGE_KEYS.HEADER_NOTE, latestValue);
    }
  };

  const handleNoteChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || "";

    // Limit text length
    if (newText.length <= MAX_NOTE_CHARS) {
      setNote(newText);
    } else {
      // If text is too long, truncate it and update the DOM element
      const truncated = newText.substring(0, MAX_NOTE_CHARS);
      setNote(truncated);
      e.currentTarget.textContent = truncated;

      // Place cursor at the end after truncating
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(e.currentTarget);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  return (
    <StyledNoteContainer>
      {isEditing ? (
        <>
          <StyledNoteWrapper ref={focusWrapperRef}>
            <StyledNoteText
              id={ID_HEADER_NOTE_INPUT}
              ref={focusRef}
              contentEditable
              suppressContentEditableWarning
              isEditing={true}
              textLength={note.length}
              onBlur={handleNoteBlur}
              onKeyDown={handleNoteKeyDown}
              onInput={handleNoteChange}
            />
          </StyledNoteWrapper>
          <StyledCharCounter isNearLimit={note.length > MAX_NOTE_CHARS * 0.8}>
            {note.length}/{MAX_NOTE_CHARS}
          </StyledCharCounter>
        </>
      ) : note ? (
        <StyledNoteWrapper
          ref={focusWrapperRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setShowUnderline(false)}
        >
          <StyledNoteText
            isEditing={false}
            textLength={note.length}
            onClick={handleNoteClick}
          >
            {note}
          </StyledNoteText>
          <StyledUnderline isVisible={showUnderline} preserveAspectRatio="none">
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
        </StyledNoteWrapper>
      ) : (
        <StyledNoteWrapper
          ref={placeholderRef}
          onMouseEnter={handlePlaceholderMouseEnter}
          onMouseLeave={() => setShowPlaceholderUnderline(false)}
        >
          <StyledNotePlaceholder onClick={handleNoteClick}>
            Click to add your focus
          </StyledNotePlaceholder>
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
        </StyledNoteWrapper>
      )}
    </StyledNoteContainer>
  );
};
