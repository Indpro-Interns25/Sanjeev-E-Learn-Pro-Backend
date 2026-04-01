function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }
    next();
  };
}

function validatePagination(req, res, next) {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

  if (Number.isNaN(page) || page < 1) {
    return res.status(400).json({ success: false, message: 'page must be a positive integer' });
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ success: false, message: 'limit must be an integer between 1 and 100' });
  }

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
}

module.exports = {
  requireFields,
  validatePagination
};
