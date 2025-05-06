import { useEffect, useRef, useState } from "react";
import React from "react";
import { ID_HEADER_NOTE_INPUT } from "@web/common/constants/web.constants";
import { c } from "@web/common/styles/colors";
import { useNote } from "../context/HeaderNoteContext";
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

// import { theme } from "@web/common/styles/theme";

export const MAX_FOCUS_CHARS = 150; // Maximum characters for focus text

export const HeaderNote = () => {
  const { note, setNote } = useNote();
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(note);
  const [showUnderline, setShowUnderline] = useState(false);
  const [showPlaceholderUnderline, setShowPlaceholderUnderline] =
    useState(false);
  const [underlinePath, setUnderlinePath] = useState("");
  const [placeholderUnderlinePath, setPlaceholderUnderlinePath] = useState("");
  const focusRef = useRef<HTMLDivElement>(null);
  const focusWrapperRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

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
      focusRef.current.focus();

      // Place cursor at the end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(focusRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  // Effect to handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditing) {
        setIsEditing(false);
        setNote(noteValue);
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isEditing, noteValue, setNote]);

  const handleNoteClick = () => {
    setIsEditing(true);
    setNoteValue(note);
  };

  const handleNoteBlur = () => {
    setIsEditing(false);
    setNote(noteValue);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsEditing(false);
      setNote(noteValue);
    }
  };

  const handleNoteChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || "";

    // Limit text length
    if (newText.length <= MAX_FOCUS_CHARS) {
      setNoteValue(newText);
    } else {
      // If text is too long, truncate it and update the DOM element
      setNoteValue(newText.substring(0, MAX_FOCUS_CHARS));
      e.currentTarget.textContent = newText.substring(0, MAX_FOCUS_CHARS);

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
              textLength={noteValue.length}
              onBlur={handleNoteBlur}
              onKeyDown={handleNoteKeyDown}
              onInput={handleNoteChange}
            >
              {note}
            </StyledNoteText>
          </StyledNoteWrapper>
          <StyledCharCounter
            isNearLimit={noteValue.length > MAX_FOCUS_CHARS * 0.8}
          >
            {noteValue.length}/{MAX_FOCUS_CHARS}
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
                <stop offset="0%" stopColor={c.blue100} />
                <stop offset="100%" stopColor={c.blueGray100} />
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
                <stop offset="0%" stopColor={c.blue100} />
                <stop offset="100%" stopColor={c.blueGray100} />
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
