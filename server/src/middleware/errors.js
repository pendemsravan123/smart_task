function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    const message = field === 'customer'
      ? 'You have already reviewed this restaurant.'
      : `${field || 'Record'} already exists.`;
    return res.status(409).json({ message });
  }
  console.error(error);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
}

module.exports = { notFound, errorHandler };
