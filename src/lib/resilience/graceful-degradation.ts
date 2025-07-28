/**
 * Graceful Degradation Manager for Medical Applications
 * 
 * Provides fallback strategies and service degradation patterns
 * to maintain critical functionality during system failures.
 */

export interface ServiceCapability {
  name: string;
  isAvailable: boolean;
  lastChecked: number;
  fallbackStrategy: FallbackStrategy;
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  emergencyFallback?: () => Promise<any>;
}

export interface FallbackStrategy {
  type: 'cache' | 'static' | 'alternative_service' | 'emergency_protocol' | 'offline_mode';
  implementation: () => Promise<any>;
  description: string;
  reliability: number; // 0-1 scale
}

export interface DegradationConfig {
  checkInterval: number;        // Health check interval in ms
  maxFailures: number;         // Max failures before degradation
  recoveryThreshold: number;   // Success threshold for recovery
  emergencyMode: boolean;      // Enable emergency protocols
}

export class MedicalGracefulDegradation {
  private services = new Map<string, ServiceCapability>();
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly config: DegradationConfig;
  private emergencyMode = false;

  constructor(config: Partial<DegradationConfig> = {}) {
    this.config = {
      checkInterval: 30000,      // 30 seconds
      maxFailures: 3,
      recoveryThreshold: 2,
      emergencyMode: true,
      ...config
    };

    console.log('🛡️ Graceful degradation manager initialized');
    this.startHealthChecks();
  }

  /**
   * Register a service with fallback strategies
   */
  registerService(
    serviceName: string,
    capability: Omit<ServiceCapability, 'name' | 'lastChecked'>
  ): void {
    this.services.set(serviceName, {
      name: serviceName,
      lastChecked: Date.now(),
      ...capability
    });

    console.log(`📋 Registered service: ${serviceName} (${capability.medicalCriticality} criticality)`);
  }

  /**
   * Execute operation with graceful degradation
   */
  async executeWithDegradation<T>(
    serviceName: string,
    primaryOperation: () => Promise<T>,
    context?: {
      isEmergency?: boolean;
      patientId?: string;
      operationType?: string;
    }
  ): Promise<T> {
    const service = this.services.get(serviceName);
    
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    try {
      // Try primary operation if service is available
      if (service.isAvailable) {
        console.log(`🔄 Executing primary operation for ${serviceName}`);
        const result = await primaryOperation();
        
        // Mark service as healthy on success
        this.markServiceHealthy(serviceName);
        return result;
      }
    } catch (error) {
      console.error(`❌ Primary operation failed for ${serviceName}:`, error);
      this.markServiceUnhealthy(serviceName);
    }

    // Execute fallback strategy
    return this.executeFallback(service, context);
  }

  /**
   * Execute fallback strategy for a service
   */
  private async executeFallback<T>(
    service: ServiceCapability,
    context?: {
      isEmergency?: boolean;
      patientId?: string;
      operationType?: string;
    }
  ): Promise<T> {
    console.warn(`🔄 Executing fallback for ${service.name}: ${service.fallbackStrategy.type}`);

    // Emergency fallback for critical medical situations
    if (context?.isEmergency && service.emergencyFallback) {
      console.warn(`🚨 Emergency fallback activated for ${service.name}`);
      try {
        return await service.emergencyFallback();
      } catch (emergencyError) {
        console.error(`🚨 Emergency fallback failed for ${service.name}:`, emergencyError);
      }
    }

    // Execute configured fallback strategy
    try {
      const result = await service.fallbackStrategy.implementation();
      
      console.log(`✅ Fallback successful for ${service.name} (reliability: ${service.fallbackStrategy.reliability})`);
      return result;
    } catch (fallbackError) {
      console.error(`❌ Fallback failed for ${service.name}:`, fallbackError);
      
      // For critical medical services, provide emergency guidance
      if (service.medicalCriticality === 'CRITICAL') {
        return this.provideCriticalMedicalFallback(service, context) as T;
      }
      
      throw new DegradationError(
        `Both primary and fallback operations failed for ${service.name}`,
        service.name,
        fallbackError
      );
    }
  }

  /**
   * Provide critical medical fallback when all else fails
   */
  private provideCriticalMedicalFallback(
    service: ServiceCapability,
    context?: {
      isEmergency?: boolean;
      patientId?: string;
      operationType?: string;
    }
  ): any {
    const emergencyGuidance = {
      error: 'Critical medical service unavailable',
      emergencyGuidance: 'For immediate medical assistance, call 911',
      fallbackInstructions: this.getCriticalMedicalInstructions(service.name),
      contactInfo: {
        emergency: '911',
        poison: '1-800-222-1222',
        support: 'Contact your system administrator'
      },
      timestamp: new Date().toISOString(),
      serviceAffected: service.name,
      context
    };

    console.error('🚨 CRITICAL MEDICAL SERVICE FAILURE:', emergencyGuidance);
    return emergencyGuidance;
  }

  /**
   * Get critical medical instructions for service failures
   */
  private getCriticalMedicalInstructions(serviceName: string): string[] {
    const instructions: Record<string, string[]> = {
      'mistral-ai': [
        'For medical emergencies, call 911 immediately',
        'Consult with available healthcare professionals',
        'Refer to printed medical references if available',
        'Do not delay emergency care due to system issues'
      ],
      'medical-knowledge': [
        'Use alternative medical reference sources',
        'Consult medical textbooks or printed materials',
        'Contact medical professionals directly',
        'For emergencies, prioritize immediate care over system access'
      ],
      'patient-data': [
        'Use backup patient records if available',
        'Verify patient information through alternative means',
        'Document all care provided during system outage',
        'Ensure patient safety is not compromised'
      ]
    };

    return instructions[serviceName] || [
      'For medical emergencies, call 911 immediately',
      'Use alternative medical resources',
      'Contact healthcare professionals directly',
      'Document all actions taken during system outage'
    ];
  }

  /**
   * Mark service as healthy
   */
  private markServiceHealthy(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isAvailable = true;
      service.lastChecked = Date.now();
      console.log(`✅ Service ${serviceName} marked as healthy`);
    }
  }

  /**
   * Mark service as unhealthy
   */
  private markServiceUnhealthy(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isAvailable = false;
      service.lastChecked = Date.now();
      console.warn(`⚠️ Service ${serviceName} marked as unhealthy`);
      
      // Log critical service failures
      if (service.medicalCriticality === 'CRITICAL') {
        console.error(`🚨 CRITICAL MEDICAL SERVICE DOWN: ${serviceName}`);
      }
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);

    console.log(`🔍 Health checks started (interval: ${this.config.checkInterval}ms)`);
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    console.log('🔍 Performing health checks...');
    
    const healthPromises = Array.from(this.services.entries()).map(
      async ([serviceName, service]) => {
        try {
          // Simple health check - in real implementation, this would ping the service
          const isHealthy = await this.checkServiceHealth(serviceName);
          
          if (isHealthy && !service.isAvailable) {
            this.markServiceHealthy(serviceName);
          } else if (!isHealthy && service.isAvailable) {
            this.markServiceUnhealthy(serviceName);
          }
        } catch (error) {
          console.error(`Health check failed for ${serviceName}:`, error);
          this.markServiceUnhealthy(serviceName);
        }
      }
    );

    await Promise.allSettled(healthPromises);
    
    // Check if emergency mode should be activated
    this.evaluateEmergencyMode();
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceName: string): Promise<boolean> {
    // In a real implementation, this would make actual health check requests
    // For now, we'll simulate health checks
    
    try {
      // Simulate health check with random success/failure
      const healthCheckSuccess = Math.random() > 0.1; // 90% success rate
      
      if (healthCheckSuccess) {
        console.log(`✅ Health check passed for ${serviceName}`);
        return true;
      } else {
        console.warn(`⚠️ Health check failed for ${serviceName}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Health check error for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Evaluate whether emergency mode should be activated
   */
  private evaluateEmergencyMode(): void {
    const criticalServices = Array.from(this.services.values())
      .filter(service => service.medicalCriticality === 'CRITICAL');
    
    const unavailableCriticalServices = criticalServices
      .filter(service => !service.isAvailable);
    
    const shouldActivateEmergency = unavailableCriticalServices.length > 0;
    
    if (shouldActivateEmergency && !this.emergencyMode) {
      this.activateEmergencyMode();
    } else if (!shouldActivateEmergency && this.emergencyMode) {
      this.deactivateEmergencyMode();
    }
  }

  /**
   * Activate emergency mode
   */
  private activateEmergencyMode(): void {
    this.emergencyMode = true;
    console.error('🚨 EMERGENCY MODE ACTIVATED - Critical medical services unavailable');
    
    // In a real implementation, this would:
    // - Send alerts to administrators
    // - Activate emergency protocols
    // - Switch to offline mode if available
    // - Display emergency contact information
  }

  /**
   * Deactivate emergency mode
   */
  private deactivateEmergencyMode(): void {
    this.emergencyMode = false;
    console.log('✅ Emergency mode deactivated - Critical services restored');
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    overallHealth: 'healthy' | 'degraded' | 'critical';
    emergencyMode: boolean;
    services: Array<{
      name: string;
      status: 'available' | 'unavailable';
      criticality: string;
      fallbackType: string;
    }>;
    recommendations: string[];
  } {
    const services = Array.from(this.services.values());
    const unavailableServices = services.filter(s => !s.isAvailable);
    const criticalUnavailable = unavailableServices.filter(s => s.medicalCriticality === 'CRITICAL');
    
    let overallHealth: 'healthy' | 'degraded' | 'critical';
    if (criticalUnavailable.length > 0) {
      overallHealth = 'critical';
    } else if (unavailableServices.length > 0) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'healthy';
    }

    const recommendations: string[] = [];
    if (this.emergencyMode) {
      recommendations.push('Emergency protocols are active');
      recommendations.push('Contact system administrator immediately');
    }
    if (unavailableServices.length > 0) {
      recommendations.push(`${unavailableServices.length} service(s) using fallback strategies`);
    }

    return {
      overallHealth,
      emergencyMode: this.emergencyMode,
      services: services.map(service => ({
        name: service.name,
        status: service.isAvailable ? 'available' : 'unavailable',
        criticality: service.medicalCriticality,
        fallbackType: service.fallbackStrategy.type
      })),
      recommendations
    };
  }

  /**
   * Force service status (for testing)
   */
  forceServiceStatus(serviceName: string, isAvailable: boolean): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isAvailable = isAvailable;
      service.lastChecked = Date.now();
      console.log(`🔧 Forced ${serviceName} status to ${isAvailable ? 'available' : 'unavailable'}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    console.log('🧹 Graceful degradation manager destroyed');
  }
}

/**
 * Custom error for degradation failures
 */
export class DegradationError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DegradationError';
  }
}

/**
 * Common fallback strategies for medical services
 */
export const MedicalFallbackStrategies = {
  /**
   * Cache-based fallback
   */
  createCacheFallback: (cacheKey: string, defaultValue: any): FallbackStrategy => ({
    type: 'cache',
    description: 'Use cached data from previous successful requests',
    reliability: 0.8,
    implementation: async () => {
      // In real implementation, this would check localStorage, IndexedDB, etc.
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.log(`📦 Using cached data for ${cacheKey}`);
        return JSON.parse(cached);
      }
      return defaultValue;
    }
  }),

  /**
   * Static medical reference fallback
   */
  createStaticMedicalFallback: (staticData: any): FallbackStrategy => ({
    type: 'static',
    description: 'Use static medical reference data',
    reliability: 0.6,
    implementation: async () => {
      console.log('📚 Using static medical reference data');
      return staticData;
    }
  }),

  /**
   * Emergency protocol fallback
   */
  createEmergencyProtocolFallback: (): FallbackStrategy => ({
    type: 'emergency_protocol',
    description: 'Activate emergency medical protocols',
    reliability: 1.0,
    implementation: async () => {
      console.log('🚨 Activating emergency medical protocols');
      return {
        emergency: true,
        message: 'For immediate medical assistance, call 911',
        protocols: [
          'Assess patient condition',
          'Call emergency services if needed',
          'Provide basic first aid if trained',
          'Document all actions taken'
        ]
      };
    }
  }),

  /**
   * Offline mode fallback
   */
  createOfflineModeFallback: (offlineData: any): FallbackStrategy => ({
    type: 'offline_mode',
    description: 'Switch to offline mode with local data',
    reliability: 0.7,
    implementation: async () => {
      console.log('📱 Switching to offline mode');
      return {
        offline: true,
        data: offlineData,
        message: 'Operating in offline mode with limited functionality'
      };
    }
  })
};
