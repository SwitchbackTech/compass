import { useCallback, useEffect, useRef, useState } from "react";
import { colorByPriority } from "@web/common/styles/theme.util";
import { createAndSubmitEvents } from "./sandbox.util";

// Types
export interface Task {
  text: string;
  color: string;
}

export interface UseSomedaySandboxProps {
  onNext: () => void;
  onNavigationControlChange?: (shouldPrevent: boolean) => void;
}

export interface UseSomedaySandboxReturn {
  // State
  isWeekTaskReady: boolean;
  isMonthTaskReady: boolean;
  isHeaderAnimating: boolean;
  isSubmitting: boolean;
  weekTasks: Task[];
  monthTasks: Task[];
  newWeekTask: string;
  newMonthTask: string;

  // Refs
  monthInputRef: React.RefObject<HTMLInputElement>;

  // Handlers
  handleNext: () => Promise<void>;
  handleAddWeekTask: () => void;
  handleAddMonthTask: () => void;
  handleNewWeekTaskKeyPress: (e: React.KeyboardEvent) => void;
  handleNewMonthTaskKeyPress: (e: React.KeyboardEvent) => void;

  // Setters
  setNewWeekTask: (value: string) => void;
  setNewMonthTask: (value: string) => void;
}

// Constants
const WEEK_LIMIT = 3;
const MONTH_LIMIT = 4;

const colors = [
  colorByPriority.work,
  colorByPriority.self,
  colorByPriority.relationships,
];

// Custom hook for managing task state and operations
export const useSomedaySandbox = ({
  onNext,
  onNavigationControlChange,
}: UseSomedaySandboxProps): UseSomedaySandboxReturn => {
  // State
  const [isWeekTaskReady, setIsWeekTaskReady] = useState(false);
  const [isMonthTaskReady, setIsMonthTaskReady] = useState(false);
  const [isHeaderAnimating, setIsHeaderAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [weekTasks, setWeekTasks] = useState<Task[]>([
    { text: "💸 File taxes", color: colorByPriority.work },
    { text: "🥗 Get groceries", color: colorByPriority.self },
  ]);
  const [monthTasks, setMonthTasks] = useState<Task[]>([
    { text: "🤖 Start AI course", color: colorByPriority.work },
    { text: "🏠 Book Airbnb", color: colorByPriority.relationships },
    { text: "📚 Return library books", color: colorByPriority.self },
  ]);
  const [newWeekTask, setNewWeekTask] = useState("");
  const [newMonthTask, setNewMonthTask] = useState("");

  // Refs
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Utility functions
  const getRandomColor = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }, []);

  // Header animation effect
  useEffect(() => {
    setIsHeaderAnimating(true);
    const timeout = setTimeout(() => setIsHeaderAnimating(false), 2500);
    return () => clearTimeout(timeout);
  }, []);

  // Navigation prevention effect
  useEffect(() => {
    const hasUnsavedChanges =
      newWeekTask.trim() !== "" || newMonthTask.trim() !== "";

    const checkboxesNotChecked = !isWeekTaskReady || !isMonthTaskReady;

    const shouldPrevent =
      hasUnsavedChanges || checkboxesNotChecked || isSubmitting;

    if (onNavigationControlChange) {
      onNavigationControlChange(shouldPrevent);
    }
  }, [
    newWeekTask,
    newMonthTask,
    isWeekTaskReady,
    isMonthTaskReady,
    isSubmitting,
    onNavigationControlChange,
  ]);

  // Handle next step with event creation
  const handleNext = useCallback(async () => {
    // Prevent multiple submissions using ref for immediate check
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Wait for the request to complete before navigating
      await createAndSubmitEvents(weekTasks, monthTasks);

      // Navigate only after successful completion
      onNext();

      // Reset submitting state after successful navigation
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    } catch (error) {
      console.error("Failed to create someday events:", error);
      // Reset submitting state on error but don't navigate
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [weekTasks, monthTasks, onNext]);

  // Task management handlers
  const handleAddWeekTask = useCallback(() => {
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
  }, [newWeekTask, weekTasks, isWeekTaskReady, getRandomColor]);

  const handleAddMonthTask = useCallback(() => {
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
  }, [newMonthTask, monthTasks, isMonthTaskReady, getRandomColor]);

  // Keyboard event handlers
  const handleNewWeekTaskKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleAddWeekTask();
        // Focus the month input after adding a week task
        if (monthInputRef.current) {
          monthInputRef.current.focus();
        }
      }
    },
    [handleAddWeekTask],
  );

  const handleNewMonthTaskKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleAddMonthTask();
        // Focus will naturally move to the next input in tab order
      }
    },
    [handleAddMonthTask],
  );

  return {
    // State
    isWeekTaskReady,
    isMonthTaskReady,
    isHeaderAnimating,
    isSubmitting,
    weekTasks,
    monthTasks,
    newWeekTask,
    newMonthTask,

    // Refs
    monthInputRef,

    // Handlers
    handleNext,
    handleAddWeekTask,
    handleAddMonthTask,
    handleNewWeekTaskKeyPress,
    handleNewMonthTaskKeyPress,

    // Setters
    setNewWeekTask,
    setNewMonthTask,
  };
};
