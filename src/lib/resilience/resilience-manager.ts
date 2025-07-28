/**
 * Resilience Manager - Integration Layer for Medical Applications
 * 
 * Combines circuit breaker, retry, and graceful degradation patterns
 * into a unified resilience system for medical applications.
 */

import { MedicalCircuitBreaker, MedicalCircuitBreakerFactory, CircuitBreakerConfig } from './circuit-breaker';
import { MedicalRetryManager, RetryConfig, MedicalRetryPresets } from './retry-manager';
import { MedicalGracefulDegradation, MedicalFallbackStrategies, FallbackStrategy } from './graceful-degradation';

export interface ResilienceConfig {
  serviceName: string;
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  retry?: Partial<RetryConfig>;
  fallbackStrategy?: FallbackStrategy;
  emergencyFallback?: () => Promise<any>;
  enableHealthChecks?: boolean;
}

export interface OperationContext {
  isEmergency?: boolean;
  patientId?: string;
  operationType?: string;
  timeout?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ResilienceMetrics {
  serviceName: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  circuitBreakerTrips: number;
  retryAttempts: number;
  fallbackActivations: number;
  averageResponseTime: number;
  lastOperationTime: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

/**
 * Unified Resilience Manager for Medical Services
 */
export class MedicalResilienceManager {
  private circuitBreaker: MedicalCircuitBreaker;
  private retryManager: MedicalRetryManager;
  private degradationManager: MedicalGracefulDegradation;
  private metrics: ResilienceMetrics;
  private readonly config: ResilienceConfig;

  constructor(config: ResilienceConfig) {
    this.config = config;

    // Initialize circuit breaker
    this.circuitBreaker = MedicalCircuitBreakerFactory.createOrGet(
      config.serviceName,
      {
        medicalCriticality: config.medicalCriticality,
        emergencyBypass: true,
        ...config.circuitBreaker
      }
    );

    // Initialize retry manager with medical presets
    this.retryManager = this.createRetryManager(config);

    // Initialize graceful degradation
    this.degradationManager = new MedicalGracefulDegradation({
      emergencyMode: true,
      checkInterval: config.medicalCriticality === 'CRITICAL' ? 15000 : 30000
    });

    // Register service with degradation manager
    if (config.fallbackStrategy) {
      this.degradationManager.registerService(config.serviceName, {
        isAvailable: true,
        fallbackStrategy: config.fallbackStrategy,
        medicalCriticality: config.medicalCriticality,
        emergencyFallback: config.emergencyFallback
      });
    }

    // Initialize metrics
    this.metrics = {
      serviceName: config.serviceName,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      circuitBreakerTrips: 0,
      retryAttempts: 0,
      fallbackActivations: 0,
      averageResponseTime: 0,
      lastOperationTime: 0,
      healthStatus: 'healthy'
    };

    console.log(`🛡️ Resilience manager initialized for ${config.serviceName} (${config.medicalCriticality} criticality)`);
  }

  /**
   * Execute operation with full resilience protection
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    context: OperationContext = {}
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      // Execute with circuit breaker protection
      const result = await this.circuitBreaker.execute(
        // Execute with retry protection
        () => this.retryManager.executeWithRetry(
          operation,
          {
            isEmergency: context.isEmergency,
            operationType: context.operationType,
            patientId: context.patientId
          }
        ),
        {
          isEmergency: context.isEmergency,
          patientId: context.patientId,
          operationType: context.operationType
        }
      );

      // Update success metrics
      this.updateSuccessMetrics(startTime);
      return result;

    } catch (error) {
      console.error(`❌ Operation failed for ${this.config.serviceName}:`, error);

      // Try graceful degradation if available
      if (this.config.fallbackStrategy) {
        try {
          console.warn(`🔄 Attempting graceful degradation for ${this.config.serviceName}`);
          
          const fallbackResult = await this.degradationManager.executeWithDegradation(
            this.config.serviceName,
            operation,
            context
          );

          this.metrics.fallbackActivations++;
          this.updateSuccessMetrics(startTime);
          
          console.log(`✅ Graceful degradation successful for ${this.config.serviceName}`);
          return fallbackResult;

        } catch (degradationError) {
          console.error(`❌ Graceful degradation failed for ${this.config.serviceName}:`, degradationError);
        }
      }

      // Update failure metrics
      this.updateFailureMetrics(startTime, error);
      throw error;
    }
  }

  /**
   * Execute with emergency priority
   */
  async executeEmergencyOperation<T>(
    operation: () => Promise<T>,
    context: Omit<OperationContext, 'isEmergency'> = {}
  ): Promise<T> {
    console.warn(`🚨 Emergency operation initiated for ${this.config.serviceName}`);
    
    return this.executeWithResilience(operation, {
      ...context,
      isEmergency: true,
      priority: 'CRITICAL'
    });
  }

  /**
   * Create retry manager based on medical criticality
   */
  private createRetryManager(config: ResilienceConfig): MedicalRetryManager {
    if (config.retry) {
      return new MedicalRetryManager({
        medicalCriticality: config.medicalCriticality,
        ...config.retry
      });
    }

    // Use medical presets based on criticality
    switch (config.medicalCriticality) {
      case 'CRITICAL':
        return new MedicalRetryManager(MedicalRetryPresets.PATIENT_DATA);
      case 'HIGH':
        return new MedicalRetryManager(MedicalRetryPresets.MEDICAL_CONSULTATION);
      case 'MEDIUM':
        return new MedicalRetryManager(MedicalRetryPresets.MEDICAL_INFO);
      default:
        return new MedicalRetryManager({
          medicalCriticality: 'LOW',
          maxAttempts: 2,
          baseDelay: 2000
        });
    }
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.metrics.successfulOperations++;
    this.metrics.lastOperationTime = responseTime;
    
    // Update average response time
    const totalOps = this.metrics.successfulOperations + this.metrics.failedOperations;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalOps - 1) + responseTime) / totalOps;
    
    this.updateHealthStatus();
  }

  /**
   * Update failure metrics
   */
  private updateFailureMetrics(startTime: number, error: Error): void {
    const responseTime = Date.now() - startTime;
    this.metrics.failedOperations++;
    this.metrics.lastOperationTime = responseTime;
    
    // Check if circuit breaker was involved
    if (error.name === 'CircuitBreakerError') {
      this.metrics.circuitBreakerTrips++;
    }
    
    this.updateHealthStatus();
  }

  /**
   * Update health status based on metrics
   */
  private updateHealthStatus(): void {
    const totalOps = this.metrics.successfulOperations + this.metrics.failedOperations;
    if (totalOps === 0) {
      this.metrics.healthStatus = 'healthy';
      return;
    }

    const failureRate = this.metrics.failedOperations / totalOps;
    const circuitBreakerActive = !this.circuitBreaker.isAvailable();
    
    if (circuitBreakerActive || failureRate > 0.5) {
      this.metrics.healthStatus = 'critical';
    } else if (failureRate > 0.2 || this.metrics.fallbackActivations > 0) {
      this.metrics.healthStatus = 'degraded';
    } else {
      this.metrics.healthStatus = 'healthy';
    }
  }

  /**
   * Get current resilience metrics
   */
  getMetrics(): ResilienceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'critical';
    circuitBreaker: {
      state: string;
      isAvailable: boolean;
      metrics: any;
    };
    retry: {
      metrics: any;
    };
    degradation: {
      status: any;
    };
    recommendations: string[];
  } {
    const circuitBreakerHealth = this.circuitBreaker.getHealthStatus();
    const retryMetrics = this.retryManager.getMetrics();
    const degradationStatus = this.degradationManager.getSystemStatus();

    const recommendations: string[] = [];
    
    if (this.metrics.healthStatus === 'critical') {
      recommendations.push('Service is in critical state - consider emergency protocols');
    }
    if (this.metrics.circuitBreakerTrips > 0) {
      recommendations.push('Circuit breaker has been activated - check service health');
    }
    if (this.metrics.fallbackActivations > 0) {
      recommendations.push('Fallback strategies have been used - primary service may be degraded');
    }
    if (degradationStatus.emergencyMode) {
      recommendations.push('Emergency mode is active - critical services unavailable');
    }

    return {
      overall: this.metrics.healthStatus,
      circuitBreaker: {
        state: this.circuitBreaker.getState(),
        isAvailable: this.circuitBreaker.isAvailable(),
        metrics: this.circuitBreaker.getMetrics()
      },
      retry: {
        metrics: retryMetrics
      },
      degradation: {
        status: degradationStatus
      },
      recommendations
    };
  }

  /**
   * Force service health status (for testing)
   */
  forceHealthStatus(status: 'healthy' | 'degraded' | 'critical'): void {
    console.warn(`⚠️ Forcing health status to ${status} for ${this.config.serviceName}`);
    
    switch (status) {
      case 'critical':
        this.circuitBreaker.forceState('OPEN', 'Manual testing');
        this.degradationManager.forceServiceStatus(this.config.serviceName, false);
        break;
      case 'degraded':
        this.circuitBreaker.forceState('HALF_OPEN', 'Manual testing');
        this.degradationManager.forceServiceStatus(this.config.serviceName, true);
        break;
      case 'healthy':
        this.circuitBreaker.forceState('CLOSED', 'Manual testing');
        this.degradationManager.forceServiceStatus(this.config.serviceName, true);
        break;
    }
    
    this.metrics.healthStatus = status;
  }

  /**
   * Reset all metrics and states
   */
  reset(): void {
    console.log(`🔄 Resetting resilience manager for ${this.config.serviceName}`);
    
    this.circuitBreaker.reset();
    this.retryManager.resetMetrics();
    
    this.metrics = {
      serviceName: this.config.serviceName,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      circuitBreakerTrips: 0,
      retryAttempts: 0,
      fallbackActivations: 0,
      averageResponseTime: 0,
      lastOperationTime: 0,
      healthStatus: 'healthy'
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.degradationManager.destroy();
    console.log(`🧹 Resilience manager destroyed for ${this.config.serviceName}`);
  }
}

/**
 * Factory for creating medical resilience managers
 */
export class MedicalResilienceFactory {
  private static managers = new Map<string, MedicalResilienceManager>();

  /**
   * Create or get resilience manager for a service
   */
  static createOrGet(config: ResilienceConfig): MedicalResilienceManager {
    if (this.managers.has(config.serviceName)) {
      return this.managers.get(config.serviceName)!;
    }

    const manager = new MedicalResilienceManager(config);
    this.managers.set(config.serviceName, manager);
    return manager;
  }

  /**
   * Get all resilience managers
   */
  static getAllManagers(): Map<string, MedicalResilienceManager> {
    return new Map(this.managers);
  }

  /**
   * Get system-wide health summary
   */
  static getSystemHealthSummary(): {
    overallHealth: 'healthy' | 'degraded' | 'critical';
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    criticalServices: number;
    emergencyMode: boolean;
    services: Array<{
      name: string;
      health: string;
      criticality: string;
      metrics: ResilienceMetrics;
    }>;
  } {
    const managers = Array.from(this.managers.values());
    const services = managers.map(manager => {
      const metrics = manager.getMetrics();
      const health = manager.getHealthStatus();
      
      return {
        name: metrics.serviceName,
        health: metrics.healthStatus,
        criticality: manager['config'].medicalCriticality,
        metrics
      };
    });

    const healthyCount = services.filter(s => s.health === 'healthy').length;
    const degradedCount = services.filter(s => s.health === 'degraded').length;
    const criticalCount = services.filter(s => s.health === 'critical').length;
    
    const criticalMedicalServices = services.filter(
      s => s.criticality === 'CRITICAL' && s.health === 'critical'
    );
    
    let overallHealth: 'healthy' | 'degraded' | 'critical';
    if (criticalMedicalServices.length > 0) {
      overallHealth = 'critical';
    } else if (criticalCount > 0 || degradedCount > 0) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'healthy';
    }

    return {
      overallHealth,
      totalServices: services.length,
      healthyServices: healthyCount,
      degradedServices: degradedCount,
      criticalServices: criticalCount,
      emergencyMode: criticalMedicalServices.length > 0,
      services
    };
  }

  /**
   * Create medical service presets
   */
  static createMedicalServicePresets(): {
    mistralAI: MedicalResilienceManager;
    medicalKnowledge: MedicalResilienceManager;
    patientData: MedicalResilienceManager;
    emergencyProtocols: MedicalResilienceManager;
  } {
    return {
      mistralAI: this.createOrGet({
        serviceName: 'mistral-ai',
        medicalCriticality: 'HIGH',
        fallbackStrategy: MedicalFallbackStrategies.createCacheFallback('mistral-cache', {
          response: 'AI service temporarily unavailable. Please consult medical references or contact healthcare professionals.',
          fallback: true
        }),
        emergencyFallback: async () => ({
          emergency: true,
          message: 'For medical emergencies, call 911 immediately',
          guidance: 'AI consultation unavailable - seek immediate medical attention'
        })
      }),

      medicalKnowledge: this.createOrGet({
        serviceName: 'medical-knowledge',
        medicalCriticality: 'MEDIUM',
        fallbackStrategy: MedicalFallbackStrategies.createStaticMedicalFallback({
          message: 'Medical knowledge base temporarily unavailable',
          recommendation: 'Consult printed medical references or contact medical professionals'
        })
      }),

      patientData: this.createOrGet({
        serviceName: 'patient-data',
        medicalCriticality: 'CRITICAL',
        fallbackStrategy: MedicalFallbackStrategies.createCacheFallback('patient-cache', {
          error: 'Patient data service unavailable',
          instruction: 'Use backup patient records and document all care provided'
        }),
        emergencyFallback: async () => ({
          critical: true,
          message: 'Patient data system unavailable',
          protocol: 'Use alternative patient identification and documentation methods'
        })
      }),

      emergencyProtocols: this.createOrGet({
        serviceName: 'emergency-protocols',
        medicalCriticality: 'CRITICAL',
        fallbackStrategy: MedicalFallbackStrategies.createEmergencyProtocolFallback(),
        emergencyFallback: async () => ({
          emergency: true,
          protocols: [
            'Call 911 for immediate medical assistance',
            'Begin basic life support if trained',
            'Clear airway and check breathing',
            'Apply pressure to bleeding wounds',
            'Keep patient warm and comfortable'
          ]
        })
      })
    };
  }
}
