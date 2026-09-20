import { Request } from 'express';

/** Extracts the raw token from an `Authorization: Bearer <token>` header. */
export function bearerToken(request: Request): string | undefined {
  const header = request.headers['authorization'];
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
}
