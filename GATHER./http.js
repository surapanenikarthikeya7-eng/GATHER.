export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const success = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

export const pagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(40, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  return { page, limit, offset: (page - 1) * limit };
};
