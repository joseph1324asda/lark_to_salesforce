import type { ErrorRequestHandler } from 'express';
import { errorMessage } from '../utils/retry.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  res.status(500).json({ error: errorMessage(error) });
};
