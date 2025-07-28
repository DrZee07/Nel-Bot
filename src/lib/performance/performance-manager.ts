/**
 * Performance Manager - Integration Layer for Medical Applications
 * 
 * Combines debouncing, caching, and performance monitoring into a
 * unified performance optimization system for medical workflows.
 */

import { MedicalDebounceManager, MedicalDebouncePresets, DebounceConfig } from './debounce-manager';
import { MedicalCacheManager, MedicalCachePresets, CacheConfig, MedicalCacheContext } from './cache-manager';
import { medicalPerformanceMonitor, PerformanceMetric } from './performance-monitor';

export interface PerformanceConfig {
  serviceName: string;
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  debounce?: Partial<DebounceConfig>;
  cache?: Partial<CacheConfig>;
  enablePerformanceMonitoring?: boolean;
  preloadCriticalData?: boolean;
}

export interface OperationContext {
  isEmergency?: boolean;
  patientId?: string;
  operationType?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cacheKey?: string;
  cacheTTL?: number;
}

export interface PerformanceMetrics {
  serviceName: string;
  debounceMetrics: any;
  cacheMetrics: any;
  performanceScore: number;
  medicalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

/**
 * Unified Performance Manager for Medical Services
 */
export class MedicalPerformanceManager {
  private cacheManager: MedicalCacheManager;
  private readonly config: PerformanceConfig;
  private debouncedOperations = new Map<string, any>();

  constructor(config: PerformanceConfig) {
    this.config = {
      enablePerformanceMonitoring: true,
      preloadCriticalData: false,
      ...config
    };

    // Initialize cache manager with medical-specific configuration
    const cacheConfig = this.createCacheConfig(config);
    this.cacheManager = new MedicalCacheManager(cacheConfig);

    console.log(`🚀 Performance manager initialized for ${config.serviceName} (${config.medicalCriticality} criticality)`);
  }

  /**
   * Execute operation with full performance optimization
   */
  async executeWithOptimization<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: OperationContext = {}
  ): Promise<T> {
    const startTime = performance.now();
    const fullOperationName = `${this.config.serviceName}_${operationName}`;

    try {
      // Step 1: Check cache first
      let result: T | null = null;
      if (context.cacheKey) {
        result = await this.getCachedResult<T>(context.cacheKey, context);
        if (result !== null) {
          // Record cache hit performance
          if (this.config.enablePerformanceMonitoring) {
            medicalPerformanceMonitor.recordMetric(
              `${fullOperationName}_cache_hit`,
              performance.now() - startTime,
              'ms',
              this.createPerformanceContext(context)
            );
          }
          return result;
        }
      }

      // Step 2: Execute with debouncing if configured
      if (this.config.debounce) {
        result = await this.executeWithDebouncing<T>(
          fullOperationName,
          operation,
          context
        );
      } else {
        // Step 3: Execute with performance monitoring
        if (this.config.enablePerformanceMonitoring) {
          result = await medicalPerformanceMonitor.measureExecutionTime(
            fullOperationName,
            operation,
            this.createPerformanceContext(context)
          );
        } else {
          result = await operation();
        }
      }

      // Step 4: Cache the result
      if (context.cacheKey && result !== null) {
        await this.cacheResult(context.cacheKey, result, context);
      }

      // Step 5: Record overall performance
      if (this.config.enablePerformanceMonitoring) {
        const totalTime = performance.now() - startTime;
        medicalPerformanceMonitor.recordMetric(
          `${fullOperationName}_total_time`,
          totalTime,
          'ms',
          this.createPerformanceContext(context)
        );

        // Log slow medical operations
        if (totalTime > this.getPerformanceThreshold(context) && context.isEmergency) {
          console.warn(`⚠️ Slow emergency operation: ${fullOperationName} took ${totalTime.toFixed(2)}ms`);
        }
      }

      return result;

    } catch (error) {
      // Record error performance
      if (this.config.enablePerformanceMonitoring) {
        medicalPerformanceMonitor.recordMetric(
          `${fullOperationName}_error_time`,
          performance.now() - startTime,
          'ms',
          this.createPerformanceContext(context)
        );
      }

      console.error(`❌ Performance-optimized operation failed: ${fullOperationName}`, error);
      throw error;
    }
  }

  /**
   * Execute medical search with debouncing and caching
   */
  async executeMedicalSearch<T>(
    query: string,
    searchOperation: (query: string) => Promise<T>,
    context: OperationContext = {}
  ): Promise<T> {
    const cacheKey = `medical_search_${this.hashQuery(query)}`;
    
    return this.executeWithOptimization(
      'medical_search',
      () => searchOperation(query),
      {
        ...context,
        cacheKey,
        operationType: 'MEDICAL_SEARCH',
        priority: context.isEmergency ? 'CRITICAL' : 'HIGH'
      }
    );
  }

  /**
   * Execute patient data operation with high priority caching
   */
  async executePatientDataOperation<T>(
    patientId: string,
    operation: () => Promise<T>,
    context: OperationContext = {}
  ): Promise<T> {
    const cacheKey = `patient_data_${patientId}`;
    
    return this.executeWithOptimization(
      'patient_data_access',
      operation,
      {
        ...context,
        cacheKey,
        cacheTTL: 15 * 60 * 1000, // 15 minutes for patient data
        operationType: 'PATIENT_DATA',
        priority: 'CRITICAL',
        patientId
      }
    );
  }

  /**
   * Execute medical consultation with comprehensive optimization
   */
  async executeMedicalConsultation<T>(
    consultationData: any,
    operation: () => Promise<T>,
    context: OperationContext = {}
  ): Promise<T> {
    const cacheKey = `medical_consultation_${this.hashQuery(JSON.stringify(consultationData))}`;
    
    return this.executeWithOptimization(
      'medical_consultation',
      operation,
      {
        ...context,
        cacheKey,
        cacheTTL: 30 * 60 * 1000, // 30 minutes for consultations
        operationType: 'MEDICAL_CONSULTATION',
        priority: context.isEmergency ? 'CRITICAL' : 'HIGH'
      }
    );
  }

  /**
   * Preload critical medical data
   */
  async preloadCriticalMedicalData(
    dataLoaders: Record<string, () => Promise<any>>
  ): Promise<void> {
    if (!this.config.preloadCriticalData) {
      return;
    }

    console.log('🚀 Preloading critical medical data...');
    const startTime = performance.now();

    try {
      const preloadPromises = Object.entries(dataLoaders).map(async ([key, loader]) => {
        try {
          const data = await loader();
          await this.cacheManager.set(
            `preload_${key}`,
            data,
            {
              medicalCriticality: 'CRITICAL',
              containsPatientData: false
            },
            24 * 60 * 60 * 1000 // 24 hours TTL
          );
          console.log(`✅ Preloaded critical data: ${key}`);
        } catch (error) {
          console.error(`❌ Failed to preload critical data: ${key}`, error);
        }
      });

      await Promise.allSettled(preloadPromises);

      const preloadTime = performance.now() - startTime;
      if (this.config.enablePerformanceMonitoring) {
        medicalPerformanceMonitor.recordMetric(
          `${this.config.serviceName}_preload_time`,
          preloadTime,
          'ms',
          { operationType: 'PRELOAD', criticality: 'CRITICAL' }
        );
      }

      console.log(`✅ Critical medical data preloading completed in ${preloadTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Critical medical data preloading failed:', error);
    }
  }

  /**
   * Get cached result with medical context
   */
  private async getCachedResult<T>(
    cacheKey: string,
    context: OperationContext
  ): Promise<T | null> {
    const cacheContext: MedicalCacheContext = {
      isEmergency: context.isEmergency,
      patientId: context.patientId,
      medicalCriticality: this.config.medicalCriticality,
      queryType: context.operationType
    };

    return this.cacheManager.get<T>(cacheKey, cacheContext);
  }

  /**
   * Cache result with medical context
   */
  private async cacheResult<T>(
    cacheKey: string,
    result: T,
    context: OperationContext
  ): Promise<void> {
    const cacheContext: MedicalCacheContext = {
      isEmergency: context.isEmergency,
      patientId: context.patientId,
      medicalCriticality: this.config.medicalCriticality,
      containsPatientData: this.detectPatientData(result),
      queryType: context.operationType
    };

    await this.cacheManager.set(cacheKey, result, cacheContext, context.cacheTTL);
  }

  /**
   * Execute operation with debouncing
   */
  private async executeWithDebouncing<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: OperationContext
  ): Promise<T> {
    // Get or create debounced function
    let debouncedFunction = this.debouncedOperations.get(operationName);
    
    if (!debouncedFunction) {
      const debounceConfig = this.createDebounceConfig(context);
      debouncedFunction = MedicalDebounceManager.debounce(
        operation,
        debounceConfig,
        operationName
      );
      this.debouncedOperations.set(operationName, debouncedFunction);
    }

    // Execute with debouncing
    return debouncedFunction.execute();
  }

  /**
   * Create cache configuration based on service config
   */
  private createCacheConfig(config: PerformanceConfig): CacheConfig {
    // Use preset based on medical criticality
    let preset;
    switch (config.medicalCriticality) {
      case 'CRITICAL':
        preset = config.serviceName.includes('patient') 
          ? MedicalCachePresets.PATIENT_DATA
          : MedicalCachePresets.EMERGENCY_PROTOCOLS;
        break;
      case 'HIGH':
        preset = MedicalCachePresets.MEDICAL_CONSULTATION;
        break;
      case 'MEDIUM':
        preset = MedicalCachePresets.MEDICAL_KNOWLEDGE;
        break;
      default:
        preset = MedicalCachePresets.MEDICAL_KNOWLEDGE;
    }

    return {
      ...preset,
      ...config.cache
    };
  }

  /**
   * Create debounce configuration based on context
   */
  private createDebounceConfig(context: OperationContext): DebounceConfig {
    // Use preset based on operation type and emergency status
    if (context.isEmergency) {
      return {
        ...MedicalDebouncePresets.EMERGENCY,
        ...this.config.debounce
      };
    }

    switch (context.operationType) {
      case 'PATIENT_DATA':
        return {
          ...MedicalDebouncePresets.PATIENT_DATA,
          ...this.config.debounce
        };
      case 'MEDICAL_CONSULTATION':
        return {
          ...MedicalDebouncePresets.MEDICAL_CONSULTATION,
          ...this.config.debounce
        };
      case 'MEDICAL_SEARCH':
        return {
          ...MedicalDebouncePresets.MEDICAL_SEARCH,
          ...this.config.debounce
        };
      default:
        return {
          ...MedicalDebouncePresets.MEDICAL_INFO,
          ...this.config.debounce
        };
    }
  }

  /**
   * Create performance monitoring context
   */
  private createPerformanceContext(context: OperationContext): PerformanceMetric['medicalContext'] {
    return {
      isEmergency: context.isEmergency,
      patientId: context.patientId,
      operationType: context.operationType,
      criticality: this.config.medicalCriticality
    };
  }

  /**
   * Get performance threshold based on context
   */
  private getPerformanceThreshold(context: OperationContext): number {
    if (context.isEmergency) {
      return 500; // 500ms for emergency operations
    }

    switch (this.config.medicalCriticality) {
      case 'CRITICAL':
        return 1000; // 1 second for critical
      case 'HIGH':
        return 2000; // 2 seconds for high
      case 'MEDIUM':
        return 3000; // 3 seconds for medium
      default:
        return 5000; // 5 seconds for low
    }
  }

  /**
   * Detect if result contains patient data
   */
  private detectPatientData(data: any): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const patientDataIndicators = [
      'patientId', 'patient_id', 'medicalRecord', 'medical_record',
      'patientName', 'patient_name', 'dateOfBirth', 'date_of_birth'
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return patientDataIndicators.some(indicator => 
      dataString.includes(indicator.toLowerCase())
    );
  }

  /**
   * Hash query for cache key generation
   */
  private hashQuery(query: string): string {
    // Simple hash function - in production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const debounceMetrics = MedicalDebounceManager.getAllMetrics();
    const cacheMetrics = this.cacheManager.getMetrics();
    const performanceStatus = this.config.enablePerformanceMonitoring 
      ? medicalPerformanceMonitor.getPerformanceStatus()
      : { score: 100, medicalImpact: 'LOW' as const, recommendations: [] };

    return {
      serviceName: this.config.serviceName,
      debounceMetrics,
      cacheMetrics,
      performanceScore: performanceStatus.score,
      medicalImpact: performanceStatus.medicalImpact,
      recommendations: performanceStatus.recommendations
    };
  }

  /**
   * Clear all caches (HIPAA compliance)
   */
  clearAllCaches(): void {
    this.cacheManager.clear();
    console.log(`🧹 Cleared all caches for ${this.config.serviceName}`);
  }

  /**
   * Clear patient data caches (HIPAA compliance)
   */
  clearPatientDataCaches(): void {
    this.cacheManager.clearPatientData();
    console.log(`🔒 Cleared patient data caches for ${this.config.serviceName}`);
  }

  /**
   * Optimize performance based on current metrics
   */
  async optimizePerformance(): Promise<void> {
    console.log(`🔧 Optimizing performance for ${this.config.serviceName}...`);

    const metrics = this.getPerformanceMetrics();
    
    // Clear cache if hit rate is too low
    if (metrics.cacheMetrics.hitRate < 0.3) {
      console.log('📊 Low cache hit rate detected, clearing ineffective cache entries');
      // In a real implementation, this would selectively clear low-value entries
    }

    // Reset debounce metrics if they're getting stale
    const debounceKeys = Object.keys(metrics.debounceMetrics);
    if (debounceKeys.length > 10) {
      console.log('🔄 Resetting debounce metrics to prevent memory bloat');
      MedicalDebounceManager.resetAllMetrics();
    }

    // Log optimization recommendations
    if (metrics.recommendations.length > 0) {
      console.log('💡 Performance optimization recommendations:');
      metrics.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    console.log(`✅ Performance optimization completed for ${this.config.serviceName}`);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear debounced operations
    MedicalDebounceManager.cancelAll();
    this.debouncedOperations.clear();

    // Destroy cache manager
    this.cacheManager.destroy();

    console.log(`🧹 Performance manager destroyed for ${this.config.serviceName}`);
  }
}

/**
 * Factory for creating medical performance managers
 */
export class MedicalPerformanceFactory {
  private static managers = new Map<string, MedicalPerformanceManager>();

  /**
   * Create or get performance manager for a service
   */
  static createOrGet(config: PerformanceConfig): MedicalPerformanceManager {
    if (this.managers.has(config.serviceName)) {
      return this.managers.get(config.serviceName)!;
    }

    const manager = new MedicalPerformanceManager(config);
    this.managers.set(config.serviceName, manager);
    return manager;
  }

  /**
   * Get all performance managers
   */
  static getAllManagers(): Map<string, MedicalPerformanceManager> {
    return new Map(this.managers);
  }

  /**
   * Get system-wide performance summary
   */
  static getSystemPerformanceSummary(): {
    overallScore: number;
    totalServices: number;
    criticalServices: number;
    performanceIssues: number;
    recommendations: string[];
    services: Array<{
      name: string;
      score: number;
      medicalImpact: string;
      cacheHitRate: number;
    }>;
  } {
    const managers = Array.from(this.managers.values());
    const services = managers.map(manager => {
      const metrics = manager.getPerformanceMetrics();
      return {
        name: metrics.serviceName,
        score: metrics.performanceScore,
        medicalImpact: metrics.medicalImpact,
        cacheHitRate: metrics.cacheMetrics.hitRate || 0
      };
    });

    const totalScore = services.reduce((sum, s) => sum + s.score, 0);
    const overallScore = services.length > 0 ? totalScore / services.length : 100;
    
    const criticalServices = services.filter(s => s.medicalImpact === 'CRITICAL').length;
    const performanceIssues = services.filter(s => s.score < 80).length;
    
    const allRecommendations = managers.flatMap(m => m.getPerformanceMetrics().recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      overallScore,
      totalServices: services.length,
      criticalServices,
      performanceIssues,
      recommendations: uniqueRecommendations,
      services
    };
  }

  /**
   * Create medical service performance presets
   */
  static createMedicalServicePresets(): {
    mistralAI: MedicalPerformanceManager;
    medicalKnowledge: MedicalPerformanceManager;
    patientData: MedicalPerformanceManager;
    emergencyProtocols: MedicalPerformanceManager;
  } {
    return {
      mistralAI: this.createOrGet({
        serviceName: 'mistral-ai',
        medicalCriticality: 'HIGH',
        debounce: MedicalDebouncePresets.MEDICAL_CONSULTATION,
        cache: MedicalCachePresets.MEDICAL_CONSULTATION,
        enablePerformanceMonitoring: true,
        preloadCriticalData: false
      }),

      medicalKnowledge: this.createOrGet({
        serviceName: 'medical-knowledge',
        medicalCriticality: 'MEDIUM',
        debounce: MedicalDebouncePresets.MEDICAL_SEARCH,
        cache: MedicalCachePresets.MEDICAL_KNOWLEDGE,
        enablePerformanceMonitoring: true,
        preloadCriticalData: true
      }),

      patientData: this.createOrGet({
        serviceName: 'patient-data',
        medicalCriticality: 'CRITICAL',
        debounce: MedicalDebouncePresets.PATIENT_DATA,
        cache: MedicalCachePresets.PATIENT_DATA,
        enablePerformanceMonitoring: true,
        preloadCriticalData: false
      }),

      emergencyProtocols: this.createOrGet({
        serviceName: 'emergency-protocols',
        medicalCriticality: 'CRITICAL',
        debounce: MedicalDebouncePresets.EMERGENCY,
        cache: MedicalCachePresets.EMERGENCY_PROTOCOLS,
        enablePerformanceMonitoring: true,
        preloadCriticalData: true
      })
    };
  }
}
