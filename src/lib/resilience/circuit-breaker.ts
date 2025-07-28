/**
 * Circuit Breaker Pattern Implementation for Medical Applications
 * 
 * Provides fault tolerance for external service calls with medical-specific
 * configurations and emergency bypass capabilities.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  recoveryTimeout: number;       // Time before attempting recovery (ms)
  monitoringWindow: number;      // Time window for failure counting (ms)
  emergencyBypass?: boolean;     // Allow bypass for medical emergencies
  serviceName: string;           // Service identifier for logging
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  currentState: CircuitState;
  stateChanges: number;
}

export class MedicalCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private stateChangeTime: number = Date.now();
  private metrics: CircuitBreakerMetrics;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute default
      monitoringWindow: 300000, // 5 minutes default
      emergencyBypass: false,
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      currentState: this.state,
      stateChanges: 0
    };

    console.log(`🔧 Circuit breaker initialized for ${this.config.serviceName} (${this.config.medicalCriticality} criticality)`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: { isEmergency?: boolean; patientId?: string; operationType?: string }
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Emergency bypass for critical medical situations
    if (context?.isEmergency && this.config.emergencyBypass) {
      console.warn(`🚨 Emergency bypass activated for ${this.config.serviceName}`);
      try {
        const result = await operation();
        this.onSuccess();
        return result;
      } catch (error) {
        console.error(`🚨 Emergency operation failed for ${this.config.serviceName}:`, error);
        throw error;
      }
    }

    // Check circuit state before execution
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.stateChangeTime = Date.now();
        this.metrics.stateChanges++;
        console.log(`🔄 Circuit breaker for ${this.config.serviceName} moved to HALF_OPEN`);
      } else {
        const error = new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.serviceName}. Service unavailable.`,
          this.config.serviceName,
          this.state
        );
        this.logMedicalError(error, context);
        throw error;
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(context)
      ]);

      this.onSuccess();
      
      // Log successful medical operation
      if (context?.operationType) {
        console.log(`✅ Medical operation successful: ${context.operationType} (${Date.now() - startTime}ms)`);
      }

      return result;
    } catch (error) {
      this.onFailure(error as Error, context);
      throw error;
    }
  }

  /**
   * Create timeout promise based on medical criticality
   */
  private createTimeoutPromise<T>(context?: { isEmergency?: boolean }): Promise<T> {
    const timeout = context?.isEmergency ? 5000 : // 5s for emergencies
                   this.config.medicalCriticality === 'CRITICAL' ? 10000 : // 10s for critical
                   this.config.medicalCriticality === 'HIGH' ? 15000 : // 15s for high
                   30000; // 30s for medium/low

    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeout}ms for ${this.config.serviceName}`));
      }, timeout);
    });
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();
    this.metrics.successfulRequests++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.stateChangeTime = Date.now();
      this.metrics.stateChanges++;
      console.log(`✅ Circuit breaker for ${this.config.serviceName} recovered to CLOSED`);
    }

    this.metrics.currentState = this.state;
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error, context?: { patientId?: string; operationType?: string }): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = this.lastFailureTime;

    console.error(`❌ Circuit breaker failure for ${this.config.serviceName}:`, {
      error: error.message,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      context
    });

    // Open circuit if failure threshold exceeded
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.stateChangeTime = Date.now();
      this.metrics.stateChanges++;
      
      console.error(`🚨 Circuit breaker OPENED for ${this.config.serviceName} after ${this.failureCount} failures`);
      
      // Log critical medical service failure
      if (this.config.medicalCriticality === 'CRITICAL') {
        console.error(`🏥 CRITICAL MEDICAL SERVICE FAILURE: ${this.config.serviceName} is unavailable`);
      }
    }

    this.metrics.currentState = this.state;
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.stateChangeTime >= this.config.recoveryTimeout;
  }

  /**
   * Log medical-specific errors
   */
  private logMedicalError(error: Error, context?: { patientId?: string; operationType?: string }): void {
    const logData = {
      service: this.config.serviceName,
      criticality: this.config.medicalCriticality,
      error: error.message,
      state: this.state,
      failureCount: this.failureCount,
      context,
      timestamp: new Date().toISOString()
    };

    // In a real implementation, this would integrate with the audit logger
    console.error('🏥 Medical Circuit Breaker Error:', logData);
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      ...this.metrics,
      lastFailureTime: this.lastFailureTime || undefined,
      lastSuccessTime: this.lastSuccessTime || undefined
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force circuit state (for testing or emergency situations)
   */
  forceState(state: CircuitState, reason?: string): void {
    console.warn(`⚠️ Forcing circuit breaker state to ${state} for ${this.config.serviceName}. Reason: ${reason || 'Manual override'}`);
    this.state = state;
    this.stateChangeTime = Date.now();
    this.metrics.stateChanges++;
    this.metrics.currentState = state;
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    console.log(`🔄 Resetting circuit breaker for ${this.config.serviceName}`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    this.stateChangeTime = Date.now();
    this.metrics.stateChanges++;
    this.metrics.currentState = this.state;
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Get health status for monitoring
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    state: CircuitState;
    failureRate: number;
    uptime: number;
  } {
    const totalRequests = this.metrics.totalRequests;
    const failureRate = totalRequests > 0 ? this.metrics.failedRequests / totalRequests : 0;
    const uptime = Date.now() - this.stateChangeTime;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (this.state === CircuitState.OPEN) {
      status = 'unhealthy';
    } else if (this.state === CircuitState.HALF_OPEN || failureRate > 0.1) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      state: this.state,
      failureRate,
      uptime
    };
  }
}

/**
 * Custom error for circuit breaker failures
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly circuitState: CircuitState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Factory for creating medical service circuit breakers
 */
export class MedicalCircuitBreakerFactory {
  private static breakers = new Map<string, MedicalCircuitBreaker>();

  static createOrGet(serviceName: string, config: Partial<CircuitBreakerConfig>): MedicalCircuitBreaker {
    if (this.breakers.has(serviceName)) {
      return this.breakers.get(serviceName)!;
    }

    const fullConfig: CircuitBreakerConfig = {
      serviceName,
      medicalCriticality: 'MEDIUM',
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringWindow: 300000,
      emergencyBypass: true,
      ...config
    };

    const breaker = new MedicalCircuitBreaker(fullConfig);
    this.breakers.set(serviceName, breaker);
    return breaker;
  }

  static getAllBreakers(): Map<string, MedicalCircuitBreaker> {
    return new Map(this.breakers);
  }

  static getHealthSummary(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    services: Array<{ name: string; status: string; state: CircuitState }>;
  } {
    const services = Array.from(this.breakers.entries()).map(([name, breaker]) => {
      const health = breaker.getHealthStatus();
      return {
        name,
        status: health.status,
        state: health.state
      };
    });

    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      degradedServices: services.filter(s => s.status === 'degraded').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      services
    };
  }
}
