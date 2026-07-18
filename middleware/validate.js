const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains and returns 422 with error details
 * if any field failed validation.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { handleValidationErrors };
