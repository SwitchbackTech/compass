// Shared base for every provider-port error class. Each port (auth, calendar,
// event, event-reader, event-writer, notifications) defines its own error
// class only to narrow `reason` to its own reason union — the six bodies were
// otherwise identical. Subclassing (not a type alias) preserves `instanceof`
// narrowing per port: `err instanceof ProviderAuthError` still narrows `reason`
// to `ProviderAuthErrorReason` because each subclass has its own prototype.
// `new.target.name` sets `.name` to the concrete subclass's name automatically,
// so each one-liner subclass needs no constructor of its own.
export class ProviderError<Reason extends string> extends Error {
  constructor(
    readonly reason: Reason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}
