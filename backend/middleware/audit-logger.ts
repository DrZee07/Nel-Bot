import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface AuditLogEntry {
  timestamp: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  statusCode?: number;
  responseTime?: number;
  dataAccessed?: boolean;
  patientDataInvolved?: boolean;
  errorDetails?: string;
  complianceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class AuditLogger {
  private logDir: string;
  private currentLogFile: string;
  
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs', 'audit');
    this.currentLogFile = this.getLogFileName();
    this.ensureLogDirectory();
  }
  
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }
  
  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `audit-${date}.log`);
  }
  
  private generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  private determineComplianceLevel(req: Request): AuditLogEntry['complianceLevel'] {
    const path = req.path.toLowerCase();
    
    // Critical: Patient data operations
    if (path.includes('/patient') || path.includes('/medical-record')) {
      return 'CRITICAL';
    }
    
    // High: Medical consultations and diagnoses
    if (path.includes('/chat') || path.includes('/medical') || path.includes('/diagnosis')) {
      return 'HIGH';
    }
    
    // Medium: General medical information access
    if (path.includes('/knowledge') || path.includes('/reference')) {
      return 'MEDIUM';
    }
    
    // Low: System operations
    return 'LOW';
  }
  
  private containsPatientData(req: Request): boolean {
    const body = JSON.stringify(req.body || {}).toLowerCase();
    const query = JSON.stringify(req.query || {}).toLowerCase();
    
    const patientDataIndicators = [
      'patient', 'age', 'weight', 'height', 'allergy', 'medication',
      'symptom', 'diagnosis', 'treatment', 'medical history'
    ];
    
    return patientDataIndicators.some(indicator => 
      body.includes(indicator) || query.includes(indicator)
    );
  }
  
  async logRequest(req: Request, res: Response): Promise<string> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    // Store start time for response time calculation
    res.locals.auditStartTime = startTime;
    res.locals.auditRequestId = requestId;
    
    const logEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      userId: req.headers['x-user-id'] as string,
      sessionId: req.headers['x-session-id'] as string,
      action: this.getActionFromPath(req.path),
      resource: req.path,
      method: req.method,
      path: req.path,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      dataAccessed: req.method === 'GET',
      patientDataInvolved: this.containsPatientData(req),
      complianceLevel: this.determineComplianceLevel(req)
    };
    
    await this.writeLogEntry(logEntry);
    return requestId;
  }
  
  async logResponse(req: Request, res: Response): Promise<void> {
    const requestId = res.locals.auditRequestId;
    const startTime = res.locals.auditStartTime;
    
    if (!requestId || !startTime) return;
    
    const responseTime = Date.now() - startTime;
    
    const logEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      userId: req.headers['x-user-id'] as string,
      sessionId: req.headers['x-session-id'] as string,
      action: `${this.getActionFromPath(req.path)}_RESPONSE`,
      resource: req.path,
      method: req.method,
      path: req.path,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      statusCode: res.statusCode,
      responseTime,
      dataAccessed: req.method === 'GET' && res.statusCode < 400,
      patientDataInvolved: this.containsPatientData(req),
      complianceLevel: this.determineComplianceLevel(req),
      errorDetails: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined
    };
    
    await this.writeLogEntry(logEntry);
  }
  
  async logSecurityEvent(event: string, details: any, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<void> {
    const logEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      action: 'SECURITY_EVENT',
      resource: 'SYSTEM',
      method: 'SYSTEM',
      path: '/security',
      ip: 'system',
      userAgent: 'system',
      complianceLevel: severity,
      errorDetails: `${event}: ${JSON.stringify(details)}`
    };
    
    await this.writeLogEntry(logEntry);
  }
  
  private getActionFromPath(path: string): string {
    if (path.includes('/chat')) return 'MEDICAL_CONSULTATION';
    if (path.includes('/patient')) return 'PATIENT_DATA_ACCESS';
    if (path.includes('/medical')) return 'MEDICAL_QUERY';
    if (path.includes('/auth')) return 'AUTHENTICATION';
    if (path.includes('/knowledge')) return 'KNOWLEDGE_ACCESS';
    return 'GENERAL_ACCESS';
  }
  
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
  
  private async writeLogEntry(entry: AuditLogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.currentLogFile, logLine, 'utf8');
      
      // Also log critical events to console for immediate attention
      if (entry.complianceLevel === 'CRITICAL' || entry.errorDetails) {
        console.warn(`🚨 AUDIT: ${entry.complianceLevel} - ${entry.action} - ${entry.errorDetails || 'OK'}`);
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // In a production environment, this should trigger an alert
    }
  }
  
  // Rotate logs daily
  private shouldRotateLog(): boolean {
    const currentDate = new Date().toISOString().split('T')[0];
    const logFileDate = path.basename(this.currentLogFile, '.log').split('-').slice(-1)[0];
    return currentDate !== logFileDate;
  }
  
  private rotateLogIfNeeded(): void {
    if (this.shouldRotateLog()) {
      this.currentLogFile = this.getLogFileName();
    }
  }
}

const auditLogger = new AuditLogger();

// Middleware function
export const auditLoggerMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Log the incoming request
    await auditLogger.logRequest(req, res);
    
    // Override res.end to log the response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      // Log the response
      auditLogger.logResponse(req, res).catch(console.error);
      
      // Call the original end method
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't block the request if audit logging fails
    next();
  }
};

// Export the audit logger instance for direct use
export { auditLogger };

// Export as default for backward compatibility
export default auditLoggerMiddleware;
