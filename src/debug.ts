enum ErrorType {
  DebugFailure = "DebugFailure",
  ServerError = "ServerError",
  UnhandledError = "DebugFailure",
}

class BaseError {
  constructor(public type: ErrorType, public message: string, public serializedError?: string, public extra?: unknown) { }
}

class DebugFailure extends BaseError {
  constructor(public message: string, public error?: Error, public extra?: unknown) {
    super(ErrorType.DebugFailure, message, error ? JSON.stringify(error) : undefined, extra);
  }
}

export function fail(errorMessage?: string): never {
  throw new DebugFailure(errorMessage || "Assertion failed");
}

// It receives a function instead of a raw string so that the content gets evaluated lazily. Without this, an error message that
// uses the function `getPrettyKind` will trigger it independently if the assertion passes of not
export function assert<T>(condition: T, errorMessage?: () => string): asserts condition is NonNullable<T> {
  if (!condition) {
    fail(errorMessage?.());
  }
}
