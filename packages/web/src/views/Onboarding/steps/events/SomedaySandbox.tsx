import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { colorByPriority } from "@web/common/styles/theme.util";
import { OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../components/layouts/OnboardingTwoRowLayout";
import { createAndSubmitEvents } from "./someday-sandbox.util";

// Keyframes for text wave animation
const textWave = keyframes`
  0% {
    background: linear-gradient(90deg, #ffffff 0%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 0% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  30% {
    background: linear-gradient(90deg, #ffffff 0%, #60a5fa 30%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 30% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  70% {
    background: linear-gradient(90deg, #ffffff 0%, #60a5fa 70%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 70% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  100% {
    background: linear-gradient(90deg, #ffffff 0%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 100% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

// Styled Components
const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: default;
  accent-color: ${({ theme }) => theme.color.text.accent};
  pointer-events: none;

  &:not(:checked) {
    accent-color: ${({ theme }) => theme.color.fg.primary};
  }
`;

const CheckboxLabel = styled.label`
  font-family: "VT323", monospace;
  font-size: 24px;
  color: ${({ theme }) => theme.color.common.white};
  cursor: pointer;
`;

const BottomContent = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

const MainContent = styled.div`
  flex: 1;
  background-color: #12151b;
  border: 1px solid #333;
  display: flex;
  margin: 20px;
  gap: 20px;
  z-index: 5;
`;

const Sidebar = styled.div`
  width: 300px;
  background-color: #23262f;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
`;

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  font-family: "Rubik", sans-serif;
  font-size: 18px;
  color: ${({ theme }) => theme.color.common.white};
  margin: 0 0 8px 0;
`;

const TaskInput = styled.input`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  width: 100%;
  background: ${({ theme }) => theme.color.common.white};
  color: ${({ theme }) => theme.color.common.black};
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;

  &::placeholder {
    color: #666;
  }
`;

const TaskItem = styled.div<{ color: string }>`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  background: ${({ color }) => color};
  color: ${({ theme }) => theme.color.common.black};
  border-radius: 4px;
  padding: 8px 12px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #333;
  margin: 0;
`;

const AnimatedText = styled(OnboardingText)<{ isAnimating: boolean }>`
  ${({ isAnimating }) =>
    isAnimating &&
    css`
      background: linear-gradient(90deg, #ffffff 0%, #60a5fa 50%, #ffffff 100%);
      background-size: 300% 100%;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: ${textWave} 3s ease-in-out;
    `}
`;

const WEEK_LIMIT = 3;
const MONTH_LIMIT = 4;

export const SomedaySandbox: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const [isWeekTaskReady, setIsWeekTaskReady] = useState(false);
  const [isMonthTaskReady, setIsMonthTaskReady] = useState(false);
  const [isHeaderAnimating, setIsHeaderAnimating] = useState(false);
  const [isNavPrevented, setIsNavPrevented] = useState(true);
  const colors = [
    colorByPriority.work,
    colorByPriority.self,
    colorByPriority.relationships,
  ];

  useEffect(() => {
    setIsHeaderAnimating(true);
    setTimeout(() => setIsHeaderAnimating(false), 2500);
  }, []);

  const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  };

  const handleNext = async () => {
    try {
      await createAndSubmitEvents(weekTasks, monthTasks);
      // Navigate to next step after successful creation
      onNext();
    } catch (error) {
      console.error("Failed to create someday events:", error);
    }
  };

  const [weekTasks, setWeekTasks] = useState([
    { text: "💸 File taxes", color: colorByPriority.work },
    { text: "🥗 Get groceries", color: colorByPriority.self },
  ]);
  const [monthTasks, setMonthTasks] = useState([
    { text: "🤖 Start AI course", color: colorByPriority.work },
    { text: "🏠 Book Airbnb", color: colorByPriority.relationships },
    { text: "📚 Return library books", color: colorByPriority.self },
  ]);
  const [newWeekTask, setNewWeekTask] = useState("");
  const [newMonthTask, setNewMonthTask] = useState("");
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Update navigation prevention based on state
  useEffect(() => {
    if (isNavPrevented) {
      const hasUnsavedChanges =
        newWeekTask.trim() !== "" || newMonthTask.trim() !== "";

      const checkboxesNotChecked = !isWeekTaskReady || !isMonthTaskReady;

      setIsNavPrevented(hasUnsavedChanges || checkboxesNotChecked);
    }
  }, [
    newWeekTask,
    newMonthTask,
    isWeekTaskReady,
    isMonthTaskReady,
    isNavPrevented,
  ]);

  const handleAddWeekTask = () => {
    if (newWeekTask.trim()) {
      const newTasks = [
        ...weekTasks,
        { text: newWeekTask.trim(), color: getRandomColor() },
      ];
      setWeekTasks(newTasks);
      setNewWeekTask("");

      if (newTasks.length >= WEEK_LIMIT && !isWeekTaskReady) {
        setIsWeekTaskReady(true);
      }
    }
  };

  const handleAddMonthTask = () => {
    if (newMonthTask.trim()) {
      const newTasks = [
        ...monthTasks,
        { text: newMonthTask.trim(), color: getRandomColor() },
      ];
      setMonthTasks(newTasks);
      setNewMonthTask("");

      if (newTasks.length >= MONTH_LIMIT && !isMonthTaskReady) {
        setIsMonthTaskReady(true);
      }
    }
  };

  const handleNewWeekTaskKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddWeekTask();
      // Focus the month input after adding a week task
      if (monthInputRef.current) {
        monthInputRef.current.focus();
      }
    }
  };

  const handleNewMonthTaskKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddMonthTask();
      // Focus will naturally move to the next input in tab order
    }
  };

  const content = (
    <BottomContent>
      <MainContent>
        <Sidebar>
          <SidebarSection>
            <SectionTitle>This Week</SectionTitle>
            {weekTasks.length < WEEK_LIMIT && (
              <TaskInput
                autoFocus
                type="text"
                placeholder="Add new task..."
                value={newWeekTask}
                onChange={(e) => setNewWeekTask(e.target.value)}
                onKeyDown={handleNewWeekTaskKeyPress}
                onBlur={() => {
                  if (newWeekTask.trim()) {
                    handleAddWeekTask();
                  }
                }}
              />
            )}
            {weekTasks.map((task, index) => (
              <TaskItem key={index} color={task.color}>
                {task.text}
              </TaskItem>
            ))}
          </SidebarSection>

          <Divider />

          <SidebarSection>
            <SectionTitle>This Month</SectionTitle>
            {monthTasks.length < MONTH_LIMIT && (
              <TaskInput
                ref={monthInputRef}
                type="text"
                placeholder="Add new task..."
                value={newMonthTask}
                onChange={(e) => setNewMonthTask(e.target.value)}
                onKeyDown={handleNewMonthTaskKeyPress}
                onBlur={() => {
                  if (newMonthTask.trim()) {
                    handleAddMonthTask();
                  }
                }}
              />
            )}
            {monthTasks.map((task, index) => (
              <TaskItem key={index} color={task.color}>
                {task.text}
              </TaskItem>
            ))}
          </SidebarSection>
        </Sidebar>
        <LeftColumn>
          <AnimatedText isAnimating={isHeaderAnimating}>
            Behold, the all-mighty sidebar
          </AnimatedText>
          <OnboardingText>{"{dramatic music}"}</OnboardingText>
          <OnboardingText>
            Don't be shy, jot down a task and type ENTER to save
          </OnboardingText>
          <div style={{ marginTop: "40px" }}>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="week-tasks"
                checked={isWeekTaskReady}
                readOnly
              />
              <CheckboxLabel htmlFor="week-tasks">
                Create a week task
              </CheckboxLabel>
            </CheckboxContainer>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="month-tasks"
                checked={isMonthTaskReady}
                readOnly
              />
              <CheckboxLabel htmlFor="month-tasks">
                Create a month task
              </CheckboxLabel>
            </CheckboxContainer>
          </div>
        </LeftColumn>
      </MainContent>
    </BottomContent>
  );

  return (
    <OnboardingTwoRowLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
      content={content}
      nextButtonDisabled={!isWeekTaskReady || !isMonthTaskReady}
      canNavigateNext={isWeekTaskReady && isMonthTaskReady}
      defaultPreventNavigation={true}
      onNavigationControlChange={setIsNavPrevented}
      isNavPrevented={isNavPrevented}
    />
  );
};
