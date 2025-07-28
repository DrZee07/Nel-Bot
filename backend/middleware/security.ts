import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Request validation and sanitization
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Generate and set nonce for CSP
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  
  // Input validation for medical data
  if (req.body) {
    // Sanitize input to prevent XSS
    req.body = sanitizeInput(req.body);
    
    // Validate medical data structure
    if (req.path.includes('/medical') || req.path.includes('/chat')) {
      const validation = validateMedicalInput(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid medical data format',
          details: validation.errors,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  // Log security events
  if (req.headers['user-agent']?.includes('bot') || 
      req.headers['user-agent']?.includes('crawler')) {
    console.warn(`🤖 Bot detected: ${req.ip} - ${req.headers['user-agent']}`);
  }
  
  next();
};

// Input sanitization function
function sanitizeInput(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Medical data validation
function validateMedicalInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required medical data structure
  if (data.query && typeof data.query !== 'string') {
    errors.push('Medical query must be a string');
  }
  
  if (data.patientInfo) {
    if (data.patientInfo.age && (typeof data.patientInfo.age !== 'number' || data.patientInfo.age < 0 || data.patientInfo.age > 150)) {
      errors.push('Patient age must be a valid number between 0 and 150');
    }
    
    if (data.patientInfo.weight && (typeof data.patientInfo.weight !== 'number' || data.patientInfo.weight <= 0)) {
      errors.push('Patient weight must be a positive number');
    }
    
    if (data.patientInfo.allergies && !Array.isArray(data.patientInfo.allergies)) {
      errors.push('Patient allergies must be an array');
    }
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection
    /<script|javascript:|data:text\/html/i, // XSS attempts
    /\.\.\//g, // Path traversal
  ];
  
  const dataString = JSON.stringify(data);
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(dataString)) {
      errors.push('Suspicious input pattern detected');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Rate limiting for specific medical endpoints
export const medicalRateLimit = (maxRequests: number = 20, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Medical consultation rate limit exceeded',
        message: 'Please wait before making another medical query',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        timestamp: new Date().toISOString()
      });
    }
    
    clientData.count++;
    next();
  };
};
