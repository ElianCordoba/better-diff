enum ErrorType {
  DebugFailure = "DebugFailure",
  ServerError = "ServerError",
  UnhandledError = "DebugFailure",
}

class BaseError {
  constructor(public type: ErrorType, public message: string, public serializedError?: string, public extra?: unknown) {}
}

export class DebugFailure extends BaseError {
  constructor(public message: string, public error?: Error, public extra?: unknown) {
    super(ErrorType.DebugFailure, message, error ? JSON.stringify(error) : undefined, extra);
  }
}
