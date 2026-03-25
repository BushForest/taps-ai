export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = "CONFLICT") {
    super(message, code, 409);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, code = "NOT_FOUND") {
    super(message, code, 404);
  }
}
