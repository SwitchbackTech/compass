import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Pencil } from "@phosphor-icons/react";
import { Textarea } from "@web/components/Textarea";

const MAX_DESCRIPTION_LENGTH = 255;
const NEAR_LIMIT_THRESHOLD = Math.floor(MAX_DESCRIPTION_LENGTH * 0.9); // 90% of max

interface TaskDescriptionProps {
  description?: string;
  onSave: (description: string) => void;
}

const StyledDescription = styled(Textarea)`
  background: transparent;
  border: hidden;
  font-size: ${({ theme }) => theme.text.size.xl};
  font-weight: ${({ theme }) => theme.text.weight.regular};
  max-height: 180px;
  min-height: 60px;
  position: relative;
  width: 100%;
  color: ${({ theme }) => theme.color.text.light};
  transition: ${({ theme }) => theme.transition.default};
  resize: vertical;

  &:hover {
    filter: brightness(90%);
    background-color: ${({ theme }) => theme.color.border.primary};
  }

  &::-webkit-scrollbar {
    cursor: default;
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    cursor: default;
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    cursor: default;
    background: ${({ theme }) => theme.color.border.primaryDark};
    border-radius: 999px;
  }

  @-moz-document url-prefix() {
    & {
      scrollbar-width: thin;
      scrollbar-color: ${({ theme }) => theme.color.border.primaryDark}
        transparent;
    }
  }
`;

const DescriptionContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;

  &:hover .edit-icon {
    opacity: 1;
  }
`;

const EditIcon = styled(Pencil)`
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
`;

const DescriptionText = styled.div`
  cursor: pointer;
  padding: 12px 16px;
  min-height: 60px;
  text-align: center;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  transition: ${({ theme }) => theme.transition.default};
  font-size: ${({ theme }) => theme.text.size.xl};
  font-weight: ${({ theme }) => theme.text.weight.regular};
  color: ${({ theme }) => theme.color.text.light};
  white-space: pre-wrap;
  word-wrap: break-word;

  &:hover {
    filter: brightness(90%);
    background-color: ${({ theme }) => theme.color.border.primary};
  }

  &.empty {
    color: ${({ theme }) => theme.color.text.lighter};
    font-style: italic;
  }
`;

const CharacterCount = styled.div<{ isNearLimit: boolean }>`
  font-size: ${({ theme }) => theme.text.size.s};
  color: ${({ isNearLimit, theme }) =>
    isNearLimit ? theme.color.status.error : theme.color.text.lighter};
  text-align: right;
  margin-top: 4px;
`;

export const TaskDescription: React.FC<TaskDescriptionProps> = ({
  description = "",
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalValueRef = useRef(description);

  useEffect(() => {
    setValue(description);
    originalValueRef.current = description;
  }, [description]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (value !== originalValueRef.current) {
      onSave(value);
      originalValueRef.current = value;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_DESCRIPTION_LENGTH) {
      setValue(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setValue(originalValueRef.current);
      setIsEditing(false);
    }
  };

  const isNearLimit = value.length >= NEAR_LIMIT_THRESHOLD;

  return (
    <DescriptionContainer>
      {isEditing ? (
        <>
          <StyledDescription
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Add a description..."
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          <CharacterCount isNearLimit={isNearLimit}>
            {value.length}/{MAX_DESCRIPTION_LENGTH}
          </CharacterCount>
        </>
      ) : (
        <DescriptionText
          onClick={handleClick}
          className={value.length < 1 ? "empty" : ""}
        >
          {value.length < 1 ? "Add a description..." : value}
          <EditIcon size={20} className="edit-icon" weight="regular" />
        </DescriptionText>
      )}
    </DescriptionContainer>
  );
};
