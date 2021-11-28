export interface ClassNamedComponent {
  className?: string;
}

export interface UnderlinedInput {
  withUnderline?: boolean;
}

export interface SelectOption<T> {
  value: T;
  label: string;
}
