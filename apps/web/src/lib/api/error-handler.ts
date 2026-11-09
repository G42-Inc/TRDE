import { NextResponse } from 'next/server';

/**
 * Error Handler Utility
 * 
 * Provides consistent error handling and sanitization for API routes.
 * Ensures sensitive information is not exposed in production.
 */

/**
 * Sanitize error message for client response
 * In production, returns generic message to avoid exposing internal details
 */
export function sanitizeError(error: unknown, defaultMessage: string = 'An error occurred'): string {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // In production, return generic message
    return defaultMessage;
  }

  // In development, return detailed error
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * Create error response with proper sanitization
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  defaultMessage: string = 'An error occurred'
): NextResponse {
  const message = sanitizeError(error, defaultMessage);
  const isProduction = process.env.NODE_ENV === 'production';

  const response: any = {
    error: message,
  };

  // Only include stack trace in development
  if (!isProduction && error instanceof Error && error.stack) {
    response.stack = error.stack;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any, statusCode: number = 200): NextResponse {
  return NextResponse.json(data, { status: statusCode });
}
