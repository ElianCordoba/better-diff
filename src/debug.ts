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

export function assert<T>(condition: T, errorMessage?: string): asserts condition is NonNullable<T> {
  if (!condition) {
    fail(errorMessage)
  }
}
