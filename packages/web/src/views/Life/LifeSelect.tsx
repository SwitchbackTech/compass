import { type ChangeEventHandler, type ReactNode } from "react";

interface LifeSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function LifeSelect({
  id,
  label,
  value,
  onChange,
  children,
  className = "max-w-36",
}: LifeSelectProps) {
  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    onChange(event.target.value);
  };

  return (
    <label className={`flex w-full flex-col gap-1 ${className}`} htmlFor={id}>
      <span className="font-medium text-sm text-text-muted">{label}</span>
      <select
        className="h-10 rounded border border-border bg-surface px-3 text-sm text-text transition-colors hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        id={id}
        onChange={handleChange}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}
