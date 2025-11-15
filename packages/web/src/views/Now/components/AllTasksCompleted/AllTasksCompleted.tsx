import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";

export const AllTasksCompleted = () => {
  const navigate = useNavigate();

  const handleNavigateToDay = () => {
    navigate(ROOT_ROUTES.DAY);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl font-semibold text-white">
          All tasks completed for today!
        </p>
        <p className="text-lg text-white/70">
          Great work! Add more tasks in the Day view to keep going.
        </p>
      </div>
      <button
        onClick={handleNavigateToDay}
        className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-white transition-colors hover:bg-white/10 focus:ring-2 focus:ring-white/50 focus:outline-none"
      >
        Go to Day view
      </button>
    </div>
  );
};
