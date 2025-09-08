import React, { useState } from "react";
import styled from "styled-components";
import { OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../components/layouts/OnboardingTwoRowLayout";

const TopContent = styled.div`
  display: flex;
  width: 100%;
  gap: 40px;
`;

const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
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

const Sidebar = styled.div`
  width: 300px;
  background-color: #1a1d24;
  border: 1px solid #333;
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

const TaskItem = styled.div`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  background: ${({ theme }) => theme.color.common.white};
  color: ${({ theme }) => theme.color.common.black};
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
`;

const AddButton = styled.button`
  font-family: "Rubik", sans-serif;
  font-size: 16px;
  width: 32px;
  height: 32px;
  background: ${({ theme }) => theme.color.common.white};
  color: ${({ theme }) => theme.color.common.black};
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f0f0f0;
  }
`;

const MainContent = styled.div`
  flex: 1;
  background-color: #12151b;
  border: 1px solid #333;
  margin-left: 1px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #333;
  margin: 0;
`;

export const SomedaySandbox: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const [weekTasks, setWeekTasks] = useState<string[]>(["Buy groceries"]);
  const [monthTasks, setMonthTasks] = useState<string[]>([
    "Buy groceries",
    "Buy groceries",
    "Buy groceries",
  ]);
  const [weekInput, setWeekInput] = useState<string>("");
  const [monthInput, setMonthInput] = useState<string>("");
  const [weekCheckbox, setWeekCheckbox] = useState<boolean>(false);
  const [monthCheckbox, setMonthCheckbox] = useState<boolean>(false);

  const handleWeekAdd = () => {
    console.log("Clicked This Week");
    if (weekInput.trim()) {
      setWeekTasks([...weekTasks, weekInput.trim()]);
      setWeekInput("");
    }
  };

  const handleMonthAdd = () => {
    console.log("Clicked This Month");
    if (monthInput.trim()) {
      setMonthTasks([...monthTasks, monthInput.trim()]);
      setMonthInput("");
    }
  };

  const topContent = (
    <TopContent>
      <LeftColumn>
        <OnboardingText>Behold, the all mighty sidebar</OnboardingText>
        <OnboardingText>{"{dramatic music}"}</OnboardingText>
        <OnboardingText>
          Don't be shy, start capturing your future tasks
        </OnboardingText>
      </LeftColumn>
      <RightColumn>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="week-tasks"
            checked={weekCheckbox}
            onChange={(e) => setWeekCheckbox(e.target.checked)}
          />
          <CheckboxLabel htmlFor="week-tasks">
            Create 3 week tasks
          </CheckboxLabel>
        </CheckboxContainer>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="month-tasks"
            checked={monthCheckbox}
            onChange={(e) => setMonthCheckbox(e.target.checked)}
          />
          <CheckboxLabel htmlFor="month-tasks">
            Create 3 month tasks
          </CheckboxLabel>
        </CheckboxContainer>
      </RightColumn>
    </TopContent>
  );

  const bottomContent = (
    <BottomContent>
      <Sidebar>
        <SidebarSection>
          <SectionTitle>This Week</SectionTitle>
          <TaskInput
            type="text"
            placeholder="That one thing..."
            value={weekInput}
            onChange={(e) => setWeekInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleWeekAdd()}
          />
          {weekTasks.map((task, index) => (
            <TaskItem key={index}>{task}</TaskItem>
          ))}
          <AddButton onClick={handleWeekAdd}>+</AddButton>
        </SidebarSection>

        <Divider />

        <SidebarSection>
          <SectionTitle>This Month</SectionTitle>
          <TaskInput
            type="text"
            placeholder="That one thing..."
            value={monthInput}
            onChange={(e) => setMonthInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleMonthAdd()}
          />
          {monthTasks.map((task, index) => (
            <TaskItem key={index}>{task}</TaskItem>
          ))}
          <AddButton onClick={handleMonthAdd}>+</AddButton>
        </SidebarSection>
      </Sidebar>

      <MainContent />
    </BottomContent>
  );

  return (
    <OnboardingTwoRowLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
      topContent={topContent}
      bottomContent={bottomContent}
    />
  );
};
