export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  });
};

export const errorHandler = (err, req, res, next) => {
  // CORS origin errors return 403 with code CORS_BLOCKED
  if (err.code === 'CORS_BLOCKED' || (err.message && err.message.toLowerCase().includes('cors'))) {
    return res.status(403).json({
      error: {
        code: 'CORS_BLOCKED',
        message: err.message || 'CORS policy blocked access from this origin'
      }
    });
  }

  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code && typeof err.code === 'string' ? err.code : (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred';

  const response = {
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  };

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
