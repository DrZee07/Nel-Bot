/**
 * Performance Monitoring System for Medical Applications
 * 
 * Tracks performance metrics, identifies bottlenecks, and provides
 * optimization recommendations for medical workflows.
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  medicalContext?: {
    isEmergency?: boolean;
    patientId?: string;
    operationType?: string;
    criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface PerformanceThreshold {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PerformanceReport {
  timestamp: number;
  overallScore: number;           // 0-100 performance score
  metrics: PerformanceMetric[];
  violations: ThresholdViolation[];
  recommendations: string[];
  medicalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ThresholdViolation {
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'WARNING' | 'CRITICAL';
  medicalImpact: string;
  recommendation: string;
}

/**
 * Medical Performance Monitor
 */
export class MedicalPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();
  private thresholds = new Map<string, PerformanceThreshold>();
  private observers = new Map<string, PerformanceObserver>();
  private readonly maxMetricsPerType = 1000; // Limit memory usage
  private reportingInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultThresholds();
    this.initializeWebAPIs();
    this.startPeriodicReporting();
    
    console.log('📊 Medical performance monitor initialized');
  }

  /**
   * Record a performance metric with medical context
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    medicalContext?: PerformanceMetric['medicalContext']
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      medicalContext
    };

    // Get or create metrics array for this type
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsArray = this.metrics.get(name)!;
    metricsArray.push(metric);

    // Limit array size to prevent memory issues
    if (metricsArray.length > this.maxMetricsPerType) {
      metricsArray.shift(); // Remove oldest metric
    }

    // Check for threshold violations
    this.checkThresholds(metric);

    // Log critical medical performance issues
    if (medicalContext?.criticality === 'CRITICAL' || medicalContext?.isEmergency) {
      console.warn(`🚨 Critical medical performance metric: ${name} = ${value}${unit}`);
    }
  }

  /**
   * Measure execution time of a function
   */
  async measureExecutionTime<T>(
    operationName: string,
    operation: () => Promise<T> | T,
    medicalContext?: PerformanceMetric['medicalContext']
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const executionTime = performance.now() - startTime;
      
      this.recordMetric(
        `${operationName}_execution_time`,
        executionTime,
        'ms',
        medicalContext
      );

      // Log slow medical operations
      if (executionTime > 1000 && medicalContext?.criticality === 'CRITICAL') {
        console.warn(`⚠️ Slow critical medical operation: ${operationName} took ${executionTime.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.recordMetric(
        `${operationName}_execution_time_error`,
        executionTime,
        'ms',
        medicalContext
      );

      throw error;
    }
  }

  /**
   * Measure memory usage
   */
  measureMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      
      this.recordMetric('memory_used', memInfo.usedJSHeapSize, 'bytes');
      this.recordMetric('memory_total', memInfo.totalJSHeapSize, 'bytes');
      this.recordMetric('memory_limit', memInfo.jsHeapSizeLimit, 'bytes');
      
      const memoryUsagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
      this.recordMetric('memory_usage_percent', memoryUsagePercent, '%');
    }
  }

  /**
   * Measure network performance
   */
  measureNetworkPerformance(url: string, responseTime: number, success: boolean): void {
    this.recordMetric('network_response_time', responseTime, 'ms');
    this.recordMetric('network_success_rate', success ? 1 : 0, 'boolean');
    
    // Track medical API performance separately
    if (url.includes('/medical') || url.includes('/patient') || url.includes('/emergency')) {
      this.recordMetric('medical_api_response_time', responseTime, 'ms', {
        operationType: 'API_CALL',
        criticality: 'HIGH'
      });
    }
  }

  /**
   * Measure user interaction performance
   */
  measureUserInteraction(interactionType: string, duration: number, medicalContext?: PerformanceMetric['medicalContext']): void {
    this.recordMetric(
      `user_interaction_${interactionType}`,
      duration,
      'ms',
      medicalContext
    );

    // Track medical-specific interactions
    if (medicalContext?.isEmergency) {
      this.recordMetric(
        'emergency_interaction_time',
        duration,
        'ms',
        medicalContext
      );
    }
  }

  /**
   * Get performance statistics for a metric
   */
  getMetricStatistics(metricName: string, timeWindow?: number): {
    count: number;
    average: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    // Filter by time window if specified
    const now = Date.now();
    const filteredMetrics = timeWindow 
      ? metrics.filter(m => now - m.timestamp <= timeWindow)
      : metrics;

    if (filteredMetrics.length === 0) {
      return null;
    }

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count,
      average: sum / count,
      min: values[0],
      max: values[count - 1],
      median: values[Math.floor(count / 2)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)]
    };
  }

  /**
   * Generate performance report
   */
  generateReport(timeWindow: number = 5 * 60 * 1000): PerformanceReport {
    const now = Date.now();
    const reportMetrics: PerformanceMetric[] = [];
    const violations: ThresholdViolation[] = [];
    const recommendations: string[] = [];

    // Collect recent metrics
    for (const [metricName, metricArray] of this.metrics.entries()) {
      const recentMetrics = metricArray.filter(m => now - m.timestamp <= timeWindow);
      reportMetrics.push(...recentMetrics);
    }

    // Check for threshold violations
    for (const [metricName, threshold] of this.thresholds.entries()) {
      const stats = this.getMetricStatistics(metricName, timeWindow);
      if (stats) {
        if (stats.average > threshold.criticalThreshold) {
          violations.push({
            metric: metricName,
            currentValue: stats.average,
            threshold: threshold.criticalThreshold,
            severity: 'CRITICAL',
            medicalImpact: this.getMedicalImpact(metricName, stats.average, threshold),
            recommendation: this.getRecommendation(metricName, stats.average, threshold)
          });
        } else if (stats.average > threshold.warningThreshold) {
          violations.push({
            metric: metricName,
            currentValue: stats.average,
            threshold: threshold.warningThreshold,
            severity: 'WARNING',
            medicalImpact: this.getMedicalImpact(metricName, stats.average, threshold),
            recommendation: this.getRecommendation(metricName, stats.average, threshold)
          });
        }
      }
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(violations));

    // Calculate overall performance score
    const overallScore = this.calculateOverallScore(violations);

    // Determine medical impact
    const medicalImpact = this.calculateMedicalImpact(violations);

    return {
      timestamp: now,
      overallScore,
      metrics: reportMetrics,
      violations,
      recommendations,
      medicalImpact
    };
  }

  /**
   * Set custom performance threshold
   */
  setThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.metric, threshold);
    console.log(`📊 Set performance threshold for ${threshold.metric}: warning=${threshold.warningThreshold}, critical=${threshold.criticalThreshold}`);
  }

  /**
   * Initialize default performance thresholds for medical applications
   */
  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      // Response time thresholds
      {
        metric: 'medical_consultation_execution_time',
        warningThreshold: 2000,  // 2 seconds
        criticalThreshold: 5000, // 5 seconds
        medicalCriticality: 'HIGH'
      },
      {
        metric: 'emergency_protocol_execution_time',
        warningThreshold: 500,   // 0.5 seconds
        criticalThreshold: 1000, // 1 second
        medicalCriticality: 'CRITICAL'
      },
      {
        metric: 'patient_data_execution_time',
        warningThreshold: 1000,  // 1 second
        criticalThreshold: 3000, // 3 seconds
        medicalCriticality: 'CRITICAL'
      },
      {
        metric: 'medical_api_response_time',
        warningThreshold: 1500,  // 1.5 seconds
        criticalThreshold: 4000, // 4 seconds
        medicalCriticality: 'HIGH'
      },
      
      // Memory thresholds
      {
        metric: 'memory_usage_percent',
        warningThreshold: 70,    // 70%
        criticalThreshold: 85,   // 85%
        medicalCriticality: 'MEDIUM'
      },
      
      // User interaction thresholds
      {
        metric: 'emergency_interaction_time',
        warningThreshold: 200,   // 200ms
        criticalThreshold: 500,  // 500ms
        medicalCriticality: 'CRITICAL'
      },
      {
        metric: 'user_interaction_search',
        warningThreshold: 300,   // 300ms
        criticalThreshold: 800,  // 800ms
        medicalCriticality: 'MEDIUM'
      }
    ];

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.metric, threshold);
    });

    console.log(`📊 Initialized ${defaultThresholds.length} default performance thresholds`);
  }

  /**
   * Initialize Web Performance APIs
   */
  private initializeWebAPIs(): void {
    // Navigation timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Measure page load performance
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart, 'ms');
            this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms');
            this.recordMetric('first_paint', navigation.responseEnd - navigation.fetchStart, 'ms');
          }
        }, 0);
      });

      // Observe resource timing
      if ('PerformanceObserver' in window) {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.recordMetric(
                'resource_load_time',
                resourceEntry.responseEnd - resourceEntry.fetchStart,
                'ms'
              );
            }
          }
        });

        try {
          resourceObserver.observe({ entryTypes: ['resource'] });
          this.observers.set('resource', resourceObserver);
        } catch (error) {
          console.warn('Failed to observe resource timing:', error);
        }
      }
    }

    // Long task observer for detecting blocking operations
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric(
              'long_task_duration',
              entry.duration,
              'ms',
              { criticality: 'HIGH' } // Long tasks can impact medical UI responsiveness
            );
            
            console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms - may impact medical UI responsiveness`);
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  /**
   * Check metric against thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    if (metric.value > threshold.criticalThreshold) {
      console.error(`🚨 CRITICAL performance threshold exceeded: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold.criticalThreshold}${metric.unit})`);
      
      // Log medical impact
      if (metric.medicalContext?.criticality === 'CRITICAL' || metric.medicalContext?.isEmergency) {
        console.error(`🏥 MEDICAL IMPACT: Critical medical operation is performing poorly`);
      }
    } else if (metric.value > threshold.warningThreshold) {
      console.warn(`⚠️ Performance threshold warning: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold.warningThreshold}${metric.unit})`);
    }
  }

  /**
   * Get medical impact description
   */
  private getMedicalImpact(metricName: string, value: number, threshold: PerformanceThreshold): string {
    const impactMap: Record<string, string> = {
      'medical_consultation_execution_time': 'Delayed medical consultations may impact patient care decisions',
      'emergency_protocol_execution_time': 'Slow emergency protocols can be life-threatening',
      'patient_data_execution_time': 'Delayed patient data access impacts care quality',
      'medical_api_response_time': 'Slow medical API responses delay clinical workflows',
      'emergency_interaction_time': 'Slow emergency UI responses can delay critical care',
      'memory_usage_percent': 'High memory usage may cause system instability during medical procedures'
    };

    return impactMap[metricName] || 'Performance degradation may impact medical workflows';
  }

  /**
   * Get performance recommendation
   */
  private getRecommendation(metricName: string, value: number, threshold: PerformanceThreshold): string {
    const recommendationMap: Record<string, string> = {
      'medical_consultation_execution_time': 'Optimize medical consultation algorithms and implement caching',
      'emergency_protocol_execution_time': 'Preload emergency protocols and optimize critical paths',
      'patient_data_execution_time': 'Implement patient data caching and database query optimization',
      'medical_api_response_time': 'Add API response caching and implement request debouncing',
      'emergency_interaction_time': 'Optimize emergency UI components and reduce JavaScript execution time',
      'memory_usage_percent': 'Implement memory cleanup and optimize data structures'
    };

    return recommendationMap[metricName] || 'Investigate and optimize the performance bottleneck';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(violations: ThresholdViolation[]): string[] {
    const recommendations: string[] = [];

    // Critical violations first
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    if (criticalViolations.length > 0) {
      recommendations.push('🚨 URGENT: Address critical performance issues immediately to prevent medical workflow disruption');
    }

    // Medical-specific recommendations
    const medicalViolations = violations.filter(v => 
      v.metric.includes('medical') || v.metric.includes('emergency') || v.metric.includes('patient')
    );
    
    if (medicalViolations.length > 0) {
      recommendations.push('🏥 Medical performance issues detected - prioritize optimization of healthcare workflows');
    }

    // Memory recommendations
    const memoryViolations = violations.filter(v => v.metric.includes('memory'));
    if (memoryViolations.length > 0) {
      recommendations.push('💾 Implement memory optimization to prevent system instability during medical procedures');
    }

    // API recommendations
    const apiViolations = violations.filter(v => v.metric.includes('api') || v.metric.includes('response_time'));
    if (apiViolations.length > 0) {
      recommendations.push('🌐 Optimize API performance with caching, debouncing, and request optimization');
    }

    return recommendations;
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(violations: ThresholdViolation[]): number {
    let score = 100;

    // Deduct points for violations
    for (const violation of violations) {
      if (violation.severity === 'CRITICAL') {
        score -= 20; // Critical violations have major impact
      } else {
        score -= 5;  // Warning violations have minor impact
      }
    }

    // Extra penalty for medical violations
    const medicalViolations = violations.filter(v => 
      v.metric.includes('medical') || v.metric.includes('emergency') || v.metric.includes('patient')
    );
    
    score -= medicalViolations.length * 10;

    return Math.max(0, score);
  }

  /**
   * Calculate medical impact level
   */
  private calculateMedicalImpact(violations: ThresholdViolation[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const medicalViolations = violations.filter(v => 
      v.metric.includes('medical') || v.metric.includes('emergency') || v.metric.includes('patient')
    );

    if (criticalViolations.length > 0 && medicalViolations.length > 0) {
      return 'CRITICAL';
    } else if (criticalViolations.length > 0 || medicalViolations.length >= 2) {
      return 'HIGH';
    } else if (medicalViolations.length > 0 || violations.length >= 3) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Start periodic performance reporting
   */
  private startPeriodicReporting(): void {
    this.reportingInterval = setInterval(() => {
      // Measure memory usage
      this.measureMemoryUsage();
      
      // Generate and log performance report
      const report = this.generateReport();
      
      if (report.violations.length > 0) {
        console.warn(`📊 Performance Report - Score: ${report.overallScore}/100, Medical Impact: ${report.medicalImpact}`);
        console.warn(`Violations: ${report.violations.length}, Recommendations: ${report.recommendations.length}`);
      }
      
      // Log critical medical performance issues
      if (report.medicalImpact === 'CRITICAL') {
        console.error('🚨 CRITICAL MEDICAL PERFORMANCE ISSUES DETECTED - Immediate attention required');
      }
    }, 60000); // Report every minute

    console.log('📊 Started periodic performance reporting (1 minute intervals)');
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    score: number;
    medicalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    activeViolations: number;
    recommendations: string[];
  } {
    const report = this.generateReport();
    
    return {
      score: report.overallScore,
      medicalImpact: report.medicalImpact,
      activeViolations: report.violations.length,
      recommendations: report.recommendations
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear reporting interval
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = undefined;
    }

    // Disconnect performance observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();

    // Clear metrics
    this.metrics.clear();
    this.thresholds.clear();

    console.log('📊 Medical performance monitor destroyed');
  }
}

/**
 * Global performance monitor instance
 */
export const medicalPerformanceMonitor = new MedicalPerformanceMonitor();

/**
 * Performance monitoring decorator
 */
export function monitorPerformance(
  operationName?: string,
  medicalContext?: PerformanceMetric['medicalContext']
) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    const name = operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      return medicalPerformanceMonitor.measureExecutionTime(
        name,
        () => method.apply(this, args),
        medicalContext
      );
    } as T;

    return descriptor;
  };
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const React = require('react');
  
  const measureOperation = React.useCallback(
    async <T>(
      operationName: string,
      operation: () => Promise<T> | T,
      medicalContext?: PerformanceMetric['medicalContext']
    ): Promise<T> => {
      return medicalPerformanceMonitor.measureExecutionTime(operationName, operation, medicalContext);
    },
    []
  );

  const recordMetric = React.useCallback(
    (name: string, value: number, unit: string, medicalContext?: PerformanceMetric['medicalContext']) => {
      medicalPerformanceMonitor.recordMetric(name, value, unit, medicalContext);
    },
    []
  );

  const getPerformanceStatus = React.useCallback(() => {
    return medicalPerformanceMonitor.getPerformanceStatus();
  }, []);

  return {
    measureOperation,
    recordMetric,
    getPerformanceStatus
  };
}
