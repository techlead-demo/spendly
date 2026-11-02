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

/** True for the errors `express.json()` raises for a body it cannot read (malformed JSON, too large, …). */
function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof err.type === 'string' &&
    'status' in err &&
    typeof err.status === 'number' &&
    err.status >= 400 &&
    err.status < 500
  );
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (isBodyParserError(err)) {
    const message =
      err.type === 'entity.parse.failed' ? 'request body must be valid JSON' : 'request body could not be read';
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
};
