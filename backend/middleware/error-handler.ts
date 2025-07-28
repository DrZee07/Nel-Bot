import { Request, Response, NextFunction } from 'express';
import { auditLogger } from './audit-logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

// Comprehensive error handler for medical application
export const errorHandler = async (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Determine error status code
  const statusCode = error.status || error.statusCode || 500;
  
  // Log error for audit and debugging
  console.error(`🚨 Error ${statusCode}:`, {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Log security-relevant errors
  if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
    await auditLogger.logSecurityEvent('SECURITY_ERROR', {
      statusCode,
      message: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, 'HIGH');
  }

  // Log critical system errors
  if (statusCode >= 500) {
    await auditLogger.logSecurityEvent('SYSTEM_ERROR', {
      statusCode,
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    }, 'CRITICAL');
  }

  // Prepare error response based on environment and error type
  const errorResponse = {
    error: getErrorMessage(statusCode, error),
    timestamp: new Date().toISOString(),
    requestId: res.locals.auditRequestId,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message
    })
  };

  // Add specific guidance for medical application errors
  if (req.path.includes('/medical') || req.path.includes('/chat')) {
    errorResponse.error = getMedicalErrorMessage(statusCode, error);
  }

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/json');
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Get user-friendly error messages
function getErrorMessage(statusCode: number, error: ErrorWithStatus): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in and try again.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict. The request could not be completed due to a conflict.';
    case 422:
      return 'Invalid data provided. Please check your input and try again.';
    case 429:
      return 'Too many requests. Please wait before trying again.';
    case 500:
      return 'Internal server error. Please try again later.';
    case 502:
      return 'Service temporarily unavailable. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    case 504:
      return 'Request timeout. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

// Medical-specific error messages with additional context
function getMedicalErrorMessage(statusCode: number, error: ErrorWithStatus): string {
  switch (statusCode) {
    case 400:
      return 'Invalid medical data provided. Please verify patient information and try again.';
    case 401:
      return 'Medical system access requires authentication. Please log in with your healthcare credentials.';
    case 403:
      return 'Access to medical data denied. Please verify your healthcare professional credentials.';
    case 404:
      return 'Medical resource not found. The requested medical information or protocol is not available.';
    case 422:
      return 'Invalid medical parameters. Please check patient data, dosage calculations, or query format.';
    case 429:
      return 'Medical consultation rate limit exceeded. Please wait before making another medical query to ensure system stability.';
    case 500:
      return 'Medical system temporarily unavailable. For urgent medical situations, please contact emergency services immediately.';
    case 502:
    case 503:
      return 'Medical AI service temporarily unavailable. For urgent medical situations, please contact emergency services immediately.';
    case 504:
      return 'Medical consultation timeout. Please try again or contact emergency services for urgent situations.';
    default:
      return `Medical system error: ${error.message || 'Please try again or contact emergency services for urgent situations.'}`;
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error: Error) => {
  console.error('🚨 CRITICAL: Uncaught Exception:', error);
  
  await auditLogger.logSecurityEvent('UNCAUGHT_EXCEPTION', {
    message: error.message,
    stack: error.stack
  }, 'CRITICAL');
  
  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 CRITICAL: Process will exit due to uncaught exception');
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
  console.error('🚨 CRITICAL: Unhandled Promise Rejection:', reason);
  
  await auditLogger.logSecurityEvent('UNHANDLED_REJECTION', {
    reason: reason?.message || reason,
    stack: reason?.stack
  }, 'CRITICAL');
  
  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 CRITICAL: Process will exit due to unhandled promise rejection');
    process.exit(1);
  }
});

// Graceful shutdown handler
export const gracefulShutdown = (signal: string) => {
  console.log(`🔄 Received ${signal}. Starting graceful shutdown...`);
  
  // Close server connections, cleanup resources, etc.
  setTimeout(() => {
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  }, 5000);
};
