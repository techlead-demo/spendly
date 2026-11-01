import type { ErrorRequestHandler, RequestHandler } from 'express';

/** Error codes returned in `{ "error": { "code", "message" } }`. */
export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function validationError(message: string): HttpError {
  return new HttpError(400, 'VALIDATION_ERROR', message);
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
};
