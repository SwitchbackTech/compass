import { Context, useContext } from "react";

export function useMetaContext<CustomContext>(
  customContext: Context<CustomContext>,
  hookName: string = "hook",
  throwIfOutsideContext = true,
): Exclude<CustomContext, undefined | null> {
  const provider = customContext.displayName ?? "Provider";
  const context = useContext(customContext);
  const outsideContext = context === null || context === undefined;

  if (outsideContext && throwIfOutsideContext) {
    throw new Error(
      `${hookName} must be used within ${provider} and be defined.`,
    );
  }

  return context as Exclude<CustomContext, undefined | null>;
}
