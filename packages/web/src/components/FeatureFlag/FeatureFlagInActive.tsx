import { useNavigate } from "react-router-dom";

export function FeatureFlagInActive() {
  const navigate = useNavigate();

  return (
    <div className="bg-orange/20 border-orange/30 border-b px-4 py-2 text-sm text-white">
      <p>
        <strong>Experimental Feature:</strong> This feature is currently in
        beta. Click the flask icon and toggle the "experiment_planner" feature
        flag to try it out.
      </p>
      <p>
        If you do not see the toggle icon after clicking the flask icon, ask
        Tyler to add you to the list of beta users.
      </p>
      <p>
        If nothing happens when you click the flask icon, refresh the page and
        retry.
      </p>
      <button
        onClick={() => navigate("/")}
        className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
      >
        Return to Calendar
      </button>
    </div>
  );
}
