import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.status ?? 500;
  const message = status === 500 ? "Internal Server Error" : err.message;

  logger.error({ err, status }, "API error");

  res.status(status).json({
    message,
    details: err.details,
  });
};
