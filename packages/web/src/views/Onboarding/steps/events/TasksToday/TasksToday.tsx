import React from "react";
import dayjs from "@core/util/date/dayjs";
import { OnboardingStepProps } from "@web/views/Onboarding/components/Onboarding";
import { OnboardingTwoRowLayout } from "@web/views/Onboarding/components/layouts/OnboardingTwoRowLayout";
import { OnboardingText } from "@web/views/Onboarding/components/styled";
import { StaticAgenda } from "./StaticAgenda";
import {
  BottomContent,
  DateHeader,
  DateSubheader,
  MainContent,
  RightColumn,
  SectionTitle,
  SidebarSection,
  TaskInput,
  TaskItem,
  TasksColumn,
  TopContent,
} from "./styled";
import { useTasksToday } from "./useTasksToday";

export const TasksToday: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
  onNavigationControlChange,
  isNavPrevented = false,
}) => {
  const {
    isTaskCreated,
    tasks,
    newTask,
    handleNext,
    handleAddTask,
    handleTaskKeyPress,
    setNewTask,
  } = useTasksToday({
    onNext,
    onNavigationControlChange,
  });

  const today = dayjs().startOf("day").utc();
  const dateHeader = today.format("dddd");
  const dateSubheader = today.format("MMMM D");

  const content = (
    <BottomContent>
      <TopContent>
        {isTaskCreated ? (
          <OnboardingText>
            Great! You&apos;ve created a task. You can add more and continue
            when you&apos;re done.
          </OnboardingText>
        ) : (
          <>
            <OnboardingText>What do you need to do today?</OnboardingText>
            <OnboardingText>Add a task below</OnboardingText>
          </>
        )}
      </TopContent>
      <MainContent>
        <TasksColumn>
          <SidebarSection>
            <DateHeader>{dateHeader}</DateHeader>
            <DateSubheader>{dateSubheader}</DateSubheader>
            {tasks.length < 5 && (
              <TaskInput
                autoFocus
                id="task-input"
                name="task-input"
                type="text"
                placeholder="Create new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={handleTaskKeyPress}
                onBlur={() => {
                  if (newTask.trim()) {
                    handleAddTask();
                  }
                }}
              />
            )}
            {tasks.map((task) => (
              <TaskItem key={task.id}>{task.title}</TaskItem>
            ))}
          </SidebarSection>
        </TasksColumn>
        <RightColumn>
          <SectionTitle>Agenda</SectionTitle>
          <StaticAgenda />
        </RightColumn>
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
      isNextBtnDisabled={!isTaskCreated}
      canNavigateNext={isTaskCreated}
      onNavigationControlChange={onNavigationControlChange}
      isNavPrevented={isNavPrevented}
      handlesKeyboardEvents={true}
    />
  );
};
