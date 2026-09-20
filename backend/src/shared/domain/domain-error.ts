export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The requested resource does not exist. */
export class ResourceNotFoundError extends DomainError {}

/** The operation conflicts with the current state (duplicates, already running, port taken). */
export class ConflictError extends DomainError {}

/** The request is well formed but cannot be satisfied (missing executable, bad path). */
export class InvalidOperationError extends DomainError {}

/** The caller is not allowed to perform the operation. */
export class ForbiddenError extends DomainError {}
