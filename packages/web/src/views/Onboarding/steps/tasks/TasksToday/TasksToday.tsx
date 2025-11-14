import React, { useEffect, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { OnboardingStepProps } from "@web/views/Onboarding/components/Onboarding";
import { OnboardingTwoRowLayout } from "@web/views/Onboarding/components/layouts/OnboardingTwoRowLayout";
import { OnboardingText } from "@web/views/Onboarding/components/styled";
import { StaticAgenda } from "./StaticAgenda";
import { MAX_TASKS, useTasksToday } from "./useTasksToday";

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

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tasks.length < MAX_TASKS && inputRef.current) {
      inputRef.current.focus();
    }
  }, [tasks.length]);

  const today = dayjs().startOf("day").utc();
  const dateHeader = today.format("dddd");
  const dateSubheader = today.format("MMMM D");

  const content = (
    <div className="flex h-full w-full flex-col items-center">
      <div className="p-5 text-center">
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
      </div>
      <div className="z-[5] m-5 flex max-w-[800px] flex-1 gap-5 border border-[#333] bg-[#12151b]">
        <div className="flex w-[350px] flex-col gap-5 bg-[#23262f] p-5">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 mb-0.5 font-['Rubik'] text-2xl text-white">
              {dateHeader}
            </h2>
            <p className="m-0 font-['Rubik'] text-base text-[hsl(47_7_73)]">
              {dateSubheader}
            </p>
            {tasks.length < MAX_TASKS && (
              <input
                ref={inputRef}
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
                className="w-full rounded border-2 border-[hsl(202_100_67)] bg-white px-3 py-2 font-['Rubik'] text-sm text-black shadow-[0_0_8px_rgba(96,165,250,0.3)] placeholder:text-[#666] focus:border-[hsl(202_100_67)] focus:shadow-[0_0_12px_rgba(96,165,250,0.5)] focus:outline-none"
              />
            )}
            {tasks.length > 0 && (
              <ul className="m-0 w-full list-none p-0">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="w-full rounded bg-white px-3 py-2 font-['Rubik'] text-sm text-black"
                  >
                    {task.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex w-[350px] flex-1 flex-col bg-[#23262f] p-5">
          <h3 className="m-0 mb-2 font-['Rubik'] text-lg text-white">Agenda</h3>
          <StaticAgenda />
        </div>
      </div>
    </div>
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
