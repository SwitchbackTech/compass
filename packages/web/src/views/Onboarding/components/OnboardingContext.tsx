import React, { createContext, useContext, useState } from "react";

interface OnboardingContextType {
  hideSteps: boolean;
  setHideSteps: (hideSteps: boolean) => void;
  firstName?: string;
  setFirstName: (firstName: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

interface OnboardingProviderProps {
  children: React.ReactNode;
  defaultValues?: {
    hideSteps?: boolean;
    firstName?: string;
  };
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  defaultValues,
}) => {
  const [hideSteps, setHideSteps] = useState(defaultValues?.hideSteps ?? false);
  const [firstName, setFirstName] = useState<string | undefined>(
    defaultValues?.firstName,
  );
  const value = {
    hideSteps,
    setHideSteps,
    firstName,
    setFirstName,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};

export const withProvider = (Component: React.ComponentType<any>) => {
  // eslint-disable-next-line react/display-name
  return (props: any) => {
    return (
      <OnboardingProvider>
        <Component {...props} />
      </OnboardingProvider>
    );
  };
};
