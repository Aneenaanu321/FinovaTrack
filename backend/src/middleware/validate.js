const { ZodError } = require('zod');
const { AppError } = require('./errors');

function formatZodError(error) {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      return next(new AppError('Validation failed', 400, formatZodError(result.error)));
    }
    req.validated = result.data;
    next();
  };
}

module.exports = { validate, formatZodError, ZodError };
