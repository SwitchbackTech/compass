import React from "react";
import { Divider } from "@web/components/Divider";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../../components/layouts/OnboardingTwoRowLayout";
import {
  AnimatedText,
  BottomContent,
  Checkbox,
  CheckboxContainer,
  CheckboxLabel,
  LeftColumn,
  MainContent,
  SectionTitle,
  Sidebar,
  SidebarSection,
  TaskInput,
  TaskItem,
} from "./styled";
import { useSomedaySandbox } from "./useSomedaySandbox";
import { useSomedaySandboxKeyboard } from "./useSomedaySandboxShortcuts";

const WEEK_LIMIT = 3;
const MONTH_LIMIT = 4;

export const SomedaySandbox: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onNavigationControlChange,
  isNavPrevented = false,
}) => {
  // Use the custom hooks
  const {
    isWeekTaskReady,
    isMonthTaskReady,
    isHeaderAnimating,
    isSubmitting,
    weekTasks,
    monthTasks,
    newWeekTask,
    newMonthTask,
    monthInputRef,
    handleNext,
    handleAddWeekTask,
    handleAddMonthTask,
    handleNewWeekTaskKeyPress,
    handleNewMonthTaskKeyPress,
    setNewWeekTask,
    setNewMonthTask,
  } = useSomedaySandbox({
    onNext,
    onNavigationControlChange,
  });

  // Use the keyboard shortcuts hook
  useSomedaySandboxKeyboard({
    isWeekTaskReady,
    isMonthTaskReady,
    isSubmitting,
    handleNext,
    onPrevious,
  });

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
          {!isWeekTaskReady || !isMonthTaskReady ? (
            <>
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
            </>
          ) : (
            <>
              <OnboardingText>
                Nice work. Who said being organized had to be complicated?
              </OnboardingText>
              <OnboardingText>
                To continue, click the right arrow or press the 'k' key (There's
                a shortcut for everything here)
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
            </>
          )}
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
      isNextBtnDisabled={!isWeekTaskReady || !isMonthTaskReady || isSubmitting}
      canNavigateNext={isWeekTaskReady && isMonthTaskReady && !isSubmitting}
      onNavigationControlChange={onNavigationControlChange}
      isNavPrevented={isNavPrevented}
      handlesKeyboardEvents={true}
    />
  );
};
