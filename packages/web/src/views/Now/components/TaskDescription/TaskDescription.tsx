import { FloppyDisk, Pencil } from "@phosphor-icons/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { ShortCutLabel } from "@web/common/utils/shortcut/shortcut.util";
import { Textarea } from "@web/components/Textarea";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

const MAX_DESCRIPTION_LENGTH = 255;
const NEAR_LIMIT_THRESHOLD = Math.floor(MAX_DESCRIPTION_LENGTH * 0.9); // 90% of max
export const TASK_DESCRIPTION_ID = "focused-task-textarea";

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
`;

const EditorActions = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
`;

const SaveButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  color: ${({ theme }) => theme.color.text.light};
  cursor: pointer;
  display: inline-flex;
  height: 28px;
  justify-content: center;
  padding: 4px;
  width: 28px;
  transition: ${({ theme }) => theme.transition.default};

  &:hover,
  &:focus {
    background-color: ${({ theme }) => theme.color.border.primary};
    filter: brightness(110%);
    outline: none;
  }
`;

const saveDescriptionShortcut = (
  <span className="inline-flex items-center gap-1">
    <ShortCutLabel k="Mod" size={12} />
    <span>+</span>
    <ShortCutLabel k="Enter" size={12} />
  </span>
);

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
      const length = textareaRef.current.value.length;

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;

    const handler = () => setIsEditing(true);

    compassEventEmitter.on(CompassDOMEvents.FOCUS_TASK_DESCRIPTION, handler);

    return () => {
      compassEventEmitter.off(CompassDOMEvents.FOCUS_TASK_DESCRIPTION, handler);
    };
  }, [isEditing]);

  const saveDescription = useCallback(() => {
    setIsEditing(false);
    if (value !== originalValueRef.current) {
      onSave(value);
      originalValueRef.current = value;
    }
  }, [onSave, value]);

  useEffect(() => {
    if (!isEditing) return;

    compassEventEmitter.on(
      CompassDOMEvents.SAVE_TASK_DESCRIPTION,
      saveDescription,
    );

    return () => {
      compassEventEmitter.off(
        CompassDOMEvents.SAVE_TASK_DESCRIPTION,
        saveDescription,
      );
    };
  }, [isEditing, saveDescription]);

  const startEditing = () => {
    setIsEditing(true);
  };

  const saveDescriptionOnBlur = () => {
    saveDescription();
  };

  const updateDraftDescription = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_DESCRIPTION_LENGTH) {
      setValue(newValue);
    }
  };

  const cancelEditingOnEscape = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
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
            onChange={updateDraftDescription}
            onBlur={saveDescriptionOnBlur}
            onKeyDown={cancelEditingOnEscape}
            placeholder="Add a description..."
            maxLength={MAX_DESCRIPTION_LENGTH}
            id={TASK_DESCRIPTION_ID}
            className="overflow-y-auto"
          />
          <EditorActions>
            <CharacterCount isNearLimit={isNearLimit}>
              {value.length}/{MAX_DESCRIPTION_LENGTH}
            </CharacterCount>
            <TooltipWrapper
              description="Save description"
              shortcut={saveDescriptionShortcut}
            >
              <SaveButton
                aria-label="Save description"
                onClick={saveDescription}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                <FloppyDisk size={18} weight="regular" />
              </SaveButton>
            </TooltipWrapper>
          </EditorActions>
        </>
      ) : (
        <DescriptionText
          onClick={startEditing}
          className={value.length < 1 ? "empty" : ""}
        >
          {value.length < 1 ? "Add a description..." : value}
          <EditIcon size={20} className="edit-icon" weight="regular" />
        </DescriptionText>
      )}
    </DescriptionContainer>
  );
};
