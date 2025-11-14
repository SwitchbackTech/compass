import { TaskSelector } from "../components/TaskSelector/TaskSelector";

export const NowViewContent = () => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center px-6 py-8">
      <TaskSelector />
    </div>
  );
};
