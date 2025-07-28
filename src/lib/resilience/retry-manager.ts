/**
 * Advanced Retry Manager for Medical Applications
 * 
 * Implements sophisticated retry strategies with exponential backoff,
 * jitter, and medical-specific retry policies.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;           // Base delay in milliseconds
  maxDelay: number;            // Maximum delay cap
  backoffMultiplier: number;   // Exponential backoff multiplier
  jitter: boolean;             // Add randomization to prevent thundering herd
  retryableErrors: string[];   // Error types that should trigger retry
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  emergencyOverride?: boolean; // Allow more aggressive retries for emergencies
}

export interface RetryContext {
  attempt: number;
  totalElapsed: number;
  lastError?: Error;
  isEmergency?: boolean;
  operationType?: string;
  patientId?: string;
}

export interface RetryMetrics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageAttempts: number;
  totalDelay: number;
}

export class MedicalRetryManager {
  private readonly config: RetryConfig;
  private metrics: RetryMetrics;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        'NetworkError',
        'TimeoutError',
        'ServiceUnavailable',
        'InternalServerError',
        'BadGateway',
        'GatewayTimeout'
      ],
      medicalCriticality: 'MEDIUM',
      emergencyOverride: true,
      ...config
    };

    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      totalDelay: 0
    };

    console.log(`🔄 Retry manager initialized with ${this.config.maxAttempts} max attempts (${this.config.medicalCriticality} criticality)`);
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<RetryContext> = {}
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    // Adjust retry attempts based on medical criticality and emergency status
    const maxAttempts = this.getMaxAttempts(context);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const retryContext: RetryContext = {
        attempt,
        totalElapsed: Date.now() - startTime,
        lastError,
        ...context
      };

      try {
        console.log(`🔄 Attempt ${attempt}/${maxAttempts} for ${context.operationType || 'operation'}`);
        
        const result = await operation();
        
        // Log successful retry if not first attempt
        if (attempt > 1) {
          this.metrics.successfulRetries++;
          console.log(`✅ Operation succeeded on attempt ${attempt} after ${Date.now() - startTime}ms`);
        }
        
        this.updateMetrics(attempt, Date.now() - startTime, true);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        this.metrics.totalAttempts++;
        
        console.error(`❌ Attempt ${attempt} failed:`, {
          error: lastError.message,
          operationType: context.operationType,
          isEmergency: context.isEmergency
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          console.log(`🚫 Error not retryable: ${lastError.message}`);
          this.updateMetrics(attempt, Date.now() - startTime, false);
          throw lastError;
        }

        // Don't delay after the last attempt
        if (attempt < maxAttempts) {
          const delay = this.calculateDelay(attempt, retryContext);
          console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}`);
          
          await this.sleep(delay);
          this.metrics.totalDelay += delay;
        }
      }
    }

    // All attempts failed
    this.metrics.failedRetries++;
    this.updateMetrics(maxAttempts, Date.now() - startTime, false);
    
    const finalError = new RetryExhaustionError(
      `Operation failed after ${maxAttempts} attempts: ${lastError?.message}`,
      maxAttempts,
      lastError,
      context
    );
    
    this.logMedicalRetryFailure(finalError, context);
    throw finalError;
  }

  /**
   * Get maximum attempts based on medical criticality and emergency status
   */
  private getMaxAttempts(context: Partial<RetryContext>): number {
    let maxAttempts = this.config.maxAttempts;

    // Increase attempts for critical medical operations
    if (this.config.medicalCriticality === 'CRITICAL') {
      maxAttempts = Math.max(maxAttempts, 5);
    } else if (this.config.medicalCriticality === 'HIGH') {
      maxAttempts = Math.max(maxAttempts, 4);
    }

    // Emergency override for more aggressive retries
    if (context.isEmergency && this.config.emergencyOverride) {
      maxAttempts = Math.max(maxAttempts, 7);
      console.warn(`🚨 Emergency retry override: increasing to ${maxAttempts} attempts`);
    }

    return maxAttempts;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, context: RetryContext): number {
    // Base exponential backoff
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterFactor = 0.1; // 10% jitter
      const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
      delay += jitter;
    }

    // Cap at maximum delay
    delay = Math.min(delay, this.config.maxDelay);

    // Reduce delay for emergency situations
    if (context.isEmergency) {
      delay = Math.min(delay, 5000); // Max 5 seconds for emergencies
    }

    // Reduce delay for critical medical operations
    if (this.config.medicalCriticality === 'CRITICAL') {
      delay = Math.min(delay, 10000); // Max 10 seconds for critical
    }

    return Math.round(delay);
  }

  /**
   * Check if error should trigger a retry
   */
  private isRetryableError(error: Error): boolean {
    // Check error name/type
    if (this.config.retryableErrors.includes(error.name)) {
      return true;
    }

    // Check error message for common retryable patterns
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /unavailable/i,
      /temporary/i,
      /rate limit/i,
      /502/,
      /503/,
      /504/
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry metrics
   */
  private updateMetrics(attempts: number, totalTime: number, success: boolean): void {
    this.metrics.totalAttempts += attempts;
    
    if (success && attempts > 1) {
      this.metrics.successfulRetries++;
    } else if (!success) {
      this.metrics.failedRetries++;
    }

    // Update average attempts
    const totalOperations = this.metrics.successfulRetries + this.metrics.failedRetries;
    if (totalOperations > 0) {
      this.metrics.averageAttempts = this.metrics.totalAttempts / totalOperations;
    }
  }

  /**
   * Log medical-specific retry failures
   */
  private logMedicalRetryFailure(error: RetryExhaustionError, context: Partial<RetryContext>): void {
    const logData = {
      operationType: context.operationType,
      patientId: context.patientId,
      isEmergency: context.isEmergency,
      attempts: error.attempts,
      criticality: this.config.medicalCriticality,
      totalElapsed: context.totalElapsed,
      originalError: error.originalError?.message,
      timestamp: new Date().toISOString()
    };

    console.error('🏥 Medical Retry Exhaustion:', logData);

    // For critical medical operations, log as emergency
    if (this.config.medicalCriticality === 'CRITICAL' || context.isEmergency) {
      console.error('🚨 CRITICAL MEDICAL OPERATION FAILED AFTER ALL RETRIES:', logData);
    }
  }

  /**
   * Get retry metrics
   */
  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      totalDelay: 0
    };
  }

  /**
   * Create a retry manager with medical-specific presets
   */
  static createMedicalPreset(
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    customConfig: Partial<RetryConfig> = {}
  ): MedicalRetryManager {
    const presets: Record<string, Partial<RetryConfig>> = {
      LOW: {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      MEDIUM: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 15000,
        backoffMultiplier: 2
      },
      HIGH: {
        maxAttempts: 4,
        baseDelay: 500,
        maxDelay: 10000,
        backoffMultiplier: 1.5
      },
      CRITICAL: {
        maxAttempts: 5,
        baseDelay: 200,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        emergencyOverride: true
      }
    };

    const config = {
      ...presets[criticality],
      medicalCriticality: criticality,
      ...customConfig
    };

    return new MedicalRetryManager(config);
  }
}

/**
 * Custom error for retry exhaustion
 */
export class RetryExhaustionError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly originalError?: Error,
    public readonly context?: Partial<RetryContext>
  ) {
    super(message);
    this.name = 'RetryExhaustionError';
  }
}

/**
 * Decorator for automatic retry functionality
 */
export function withRetry(config: Partial<RetryConfig> = {}) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    const retryManager = new MedicalRetryManager(config);

    descriptor.value = async function (...args: any[]) {
      return retryManager.executeWithRetry(
        () => method.apply(this, args),
        { operationType: `${target.constructor.name}.${propertyName}` }
      );
    } as T;

    return descriptor;
  };
}

/**
 * Utility function for simple retry operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: Partial<RetryContext> = {}
): Promise<T> {
  const retryManager = new MedicalRetryManager(config);
  return retryManager.executeWithRetry(operation, context);
}

/**
 * Medical-specific retry presets
 */
export const MedicalRetryPresets = {
  /**
   * For non-critical medical information queries
   */
  MEDICAL_INFO: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    medicalCriticality: 'MEDIUM' as const
  },

  /**
   * For medical consultations and diagnoses
   */
  MEDICAL_CONSULTATION: {
    maxAttempts: 4,
    baseDelay: 500,
    maxDelay: 8000,
    medicalCriticality: 'HIGH' as const
  },

  /**
   * For critical patient data operations
   */
  PATIENT_DATA: {
    maxAttempts: 5,
    baseDelay: 200,
    maxDelay: 5000,
    medicalCriticality: 'CRITICAL' as const,
    emergencyOverride: true
  },

  /**
   * For emergency medical operations
   */
  EMERGENCY: {
    maxAttempts: 7,
    baseDelay: 100,
    maxDelay: 2000,
    medicalCriticality: 'CRITICAL' as const,
    emergencyOverride: true
  }
} as const;
