/**
 * Unified API Response Utilities
 *
 * Provides consistent response formats across all API endpoints
 */

import { VercelResponse } from '@vercel/node';

/**
 * Standard API Error Response
 */
export interface ApiError {
  success: false;
  error: string;
  code: string;
  message?: string;
  details?: any;
  timestamp: number;
}

/**
 * Standard API Success Response
 */
export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: number;
    tier?: string;
    payment_verified?: boolean;
    tx_hash?: string;
    [key: string]: any;
  };
  timestamp: number;
}

/**
 * Error Codes
 */
export const ErrorCodes = {
  // Client Errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // Server Errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
  DATA_SOURCE_ERROR: 'DATA_SOURCE_ERROR',
} as const;

/**
 * Send standardized success response
 */
export function sendSuccess<T>(
  res: VercelResponse,
  data: T,
  meta?: Record<string, any>
): void {
  const response: ApiSuccess<T> = {
    success: true,
    data,
    timestamp: Date.now(),
  };

  if (meta) {
    response.meta = {
      ...meta,
      timestamp: Date.now(),
    };
  }

  res.status(200).json(response);
}

/**
 * Send standardized error response
 */
export function sendError(
  res: VercelResponse,
  statusCode: number,
  error: string,
  code: string,
  details?: any
): void {
  const response: ApiError = {
    success: false,
    error,
    code,
    timestamp: Date.now(),
  };

  if (details) {
    response.details = details;
    response.message = typeof details === 'string' ? details : JSON.stringify(details);
  }

  res.status(statusCode).json(response);
}

/**
 * Send 400 Bad Request
 */
export function sendBadRequest(
  res: VercelResponse,
  message: string,
  details?: any
): void {
  sendError(res, 400, message, ErrorCodes.BAD_REQUEST, details);
}

/**
 * Send 400 Missing Parameter
 */
export function sendMissingParameter(
  res: VercelResponse,
  parameterName: string,
  expectedType?: string
): void {
  sendError(
    res,
    400,
    `Missing required parameter: ${parameterName}`,
    ErrorCodes.MISSING_PARAMETER,
    {
      parameter: parameterName,
      expected: expectedType || 'string',
    }
  );
}

/**
 * Send 400 Invalid Parameter
 */
export function sendInvalidParameter(
  res: VercelResponse,
  parameterName: string,
  reason: string
): void {
  sendError(
    res,
    400,
    `Invalid parameter: ${parameterName}`,
    ErrorCodes.INVALID_PARAMETER,
    {
      parameter: parameterName,
      reason,
    }
  );
}

/**
 * Send 404 Not Found
 */
export function sendNotFound(
  res: VercelResponse,
  resource: string
): void {
  sendError(
    res,
    404,
    `Resource not found: ${resource}`,
    ErrorCodes.NOT_FOUND,
    { resource }
  );
}

/**
 * Send 500 Internal Server Error
 */
export function sendInternalError(
  res: VercelResponse,
  message?: string,
  error?: any
): void {
  const errorMessage = message || 'Internal server error';
  const details = error instanceof Error ? error.message : error;

  sendError(
    res,
    500,
    errorMessage,
    ErrorCodes.INTERNAL_ERROR,
    details
  );
}

/**
 * Send 503 Service Unavailable
 */
export function sendServiceUnavailable(
  res: VercelResponse,
  service: string
): void {
  sendError(
    res,
    503,
    `Service temporarily unavailable: ${service}`,
    ErrorCodes.SERVICE_UNAVAILABLE,
    { service }
  );
}

/**
 * Send 504 Gateway Timeout
 */
export function sendGatewayTimeout(
  res: VercelResponse,
  service: string
): void {
  sendError(
    res,
    504,
    `Request timeout: ${service}`,
    ErrorCodes.GATEWAY_TIMEOUT,
    { service }
  );
}

/**
 * Send Data Source Error
 */
export function sendDataSourceError(
  res: VercelResponse,
  source: string,
  originalError: any
): void {
  sendError(
    res,
    503,
    `Data source unavailable: ${source}`,
    ErrorCodes.DATA_SOURCE_ERROR,
    {
      source,
      error: originalError instanceof Error ? originalError.message : String(originalError),
    }
  );
}
