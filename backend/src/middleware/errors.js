const { captureException } = require('../instrument/sentry');

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    this.name = 'AppError';
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate entry', field: Object.keys(err.keyPattern || {})[0] });
  }

  const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;

  if (status >= 500) {
    console.error(err);
    captureException(err, { path: req.originalUrl, method: req.method });
  }

  const body = { message: err.message || 'Internal server error' };
  if (err.details) body.details = err.details;
  if (process.env.NODE_ENV !== 'production' && status >= 500 && err.stack) {
    body.stack = err.stack.split('\n').slice(0, 5);
  }

  res.status(status).json(body);
}

module.exports = { AppError, asyncHandler, notFoundHandler, errorHandler };
