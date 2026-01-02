import React from "react";
import { Navigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";

export const OnboardingFlow: React.FC = () => {
  // Redirect to day view where the guide will be shown
  // Use Navigate component instead of useEffect to avoid blank screen
  return <Navigate to={ROOT_ROUTES.DAY} replace />;
};

export default OnboardingFlow;
