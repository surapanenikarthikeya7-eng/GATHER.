import { HttpError } from '../utils/http.js';

export function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'The requested endpoint was not found.' });
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'That record already exists.' });
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ success: false, message: 'This record is still in use and cannot be removed.' });
  }
  if (['ER_ACCESS_DENIED_ERROR', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code)) {
    console.error('Database connection failed:', error.code);
    return res.status(503).json({
      success: false,
      message: 'Server configuration is incomplete. Please configure the backend database.'
    });
  }
  if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) {
    console.error('Database schema is missing or outdated:', error.code);
    return res.status(503).json({
      success: false,
      message: 'The backend database needs setup. Ask the administrator to apply the database schema and migrations.'
    });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Image must be 5 MB or smaller.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: error.message });
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    success: false,
    message: error instanceof HttpError ? error.message : status >= 500 ? 'Something went wrong. Please try again.' : error.message
  });
}
