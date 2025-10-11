import React from "react";

export function ConditionalRender({
  condition,
  children,
}: {
  condition: boolean;
  children: React.ReactNode;
}) {
  if (!condition) return null;

  return <React.Fragment>{children}</React.Fragment>;
}
