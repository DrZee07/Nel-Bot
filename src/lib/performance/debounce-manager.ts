/**
 * Advanced Debouncing Manager for Medical Applications
 * 
 * Implements intelligent request debouncing with medical-specific
 * configurations and emergency bypass capabilities.
 */

export interface DebounceConfig {
  delay: number;                    // Debounce delay in milliseconds
  maxWait?: number;                // Maximum wait time before forcing execution
  leading?: boolean;               // Execute on leading edge
  trailing?: boolean;              // Execute on trailing edge
  emergencyBypass?: boolean;       // Allow bypass for emergency queries
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DebounceContext {
  isEmergency?: boolean;
  patientId?: string;
  queryType?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DebounceMetrics {
  totalCalls: number;
  debouncedCalls: number;
  executedCalls: number;
  emergencyBypasses: number;
  averageDelay: number;
  lastExecutionTime: number;
}

/**
 * Medical-specific debounced function wrapper
 */
class MedicalDebouncedFunction<T extends (...args: any[]) => any> {
  private timeoutId?: NodeJS.Timeout;
  private lastCallTime = 0;
  private lastExecutionTime = 0;
  private callCount = 0;
  private metrics: DebounceMetrics;
  private readonly config: DebounceConfig;
  private readonly func: T;

  constructor(func: T, config: DebounceConfig) {
    this.func = func;
    this.config = {
      leading: false,
      trailing: true,
      emergencyBypass: true,
      ...config
    };

    this.metrics = {
      totalCalls: 0,
      debouncedCalls: 0,
      executedCalls: 0,
      emergencyBypasses: 0,
      averageDelay: 0,
      lastExecutionTime: 0
    };

    console.log(`🚀 Medical debounced function created with ${config.delay}ms delay (${config.medicalCriticality} criticality)`);
  }

  /**
   * Execute the debounced function with medical context
   */
  execute = (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const context = this.extractMedicalContext(args);
      
      this.metrics.totalCalls++;
      this.lastCallTime = now;

      // Emergency bypass for critical medical queries
      if (context.isEmergency && this.config.emergencyBypass) {
        console.warn(`🚨 Emergency bypass activated - executing immediately`);
        this.metrics.emergencyBypasses++;
        this.executeImmediately(args, resolve, reject);
        return;
      }

      // Critical medical queries get reduced debounce delay
      const effectiveDelay = this.calculateEffectiveDelay(context);

      // Leading edge execution
      if (this.config.leading && !this.timeoutId) {
        this.executeImmediately(args, resolve, reject);
        return;
      }

      // Clear existing timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.metrics.debouncedCalls++;
      }

      // Check maxWait constraint
      const timeSinceLastExecution = now - this.lastExecutionTime;
      if (this.config.maxWait && timeSinceLastExecution >= this.config.maxWait) {
        console.log(`⏰ Max wait time reached (${this.config.maxWait}ms) - executing immediately`);
        this.executeImmediately(args, resolve, reject);
        return;
      }

      // Set new timeout for trailing edge execution
      if (this.config.trailing) {
        this.timeoutId = setTimeout(() => {
          this.timeoutId = undefined;
          this.executeFunction(args, resolve, reject, effectiveDelay);
        }, effectiveDelay);
      }
    });
  };

  /**
   * Extract medical context from function arguments
   */
  private extractMedicalContext(args: Parameters<T>): DebounceContext {
    // Try to extract context from the first argument if it's an object
    const firstArg = args[0];
    if (typeof firstArg === 'object' && firstArg !== null) {
      return {
        isEmergency: firstArg.isEmergency || false,
        patientId: firstArg.patientId,
        queryType: firstArg.queryType || firstArg.type,
        priority: firstArg.priority || 'MEDIUM'
      };
    }

    // Try to detect emergency keywords in string arguments
    const stringArgs = args.filter(arg => typeof arg === 'string').join(' ').toLowerCase();
    const emergencyKeywords = ['emergency', 'urgent', 'critical', 'unconscious', 'breathing', 'cardiac', 'seizure'];
    const isEmergency = emergencyKeywords.some(keyword => stringArgs.includes(keyword));

    return {
      isEmergency,
      queryType: 'unknown',
      priority: isEmergency ? 'CRITICAL' : 'MEDIUM'
    };
  }

  /**
   * Calculate effective delay based on medical context
   */
  private calculateEffectiveDelay(context: DebounceContext): number {
    let delay = this.config.delay;

    // Reduce delay for high priority medical queries
    if (context.priority === 'CRITICAL' || this.config.medicalCriticality === 'CRITICAL') {
      delay = Math.min(delay, 200); // Max 200ms for critical
    } else if (context.priority === 'HIGH' || this.config.medicalCriticality === 'HIGH') {
      delay = Math.min(delay, 500); // Max 500ms for high priority
    }

    // Further reduce for emergency context
    if (context.isEmergency) {
      delay = Math.min(delay, 100); // Max 100ms for emergencies
    }

    return delay;
  }

  /**
   * Execute function immediately without debouncing
   */
  private executeImmediately(
    args: Parameters<T>,
    resolve: (value: ReturnType<T>) => void,
    reject: (reason?: any) => void
  ): void {
    this.executeFunction(args, resolve, reject, 0);
  }

  /**
   * Execute the actual function with metrics tracking
   */
  private executeFunction(
    args: Parameters<T>,
    resolve: (value: ReturnType<T>) => void,
    reject: (reason?: any) => void,
    delay: number
  ): void {
    const startTime = Date.now();
    
    try {
      const result = this.func(...args);
      
      // Handle both sync and async functions
      if (result instanceof Promise) {
        result
          .then(value => {
            this.updateMetrics(startTime, delay);
            resolve(value);
          })
          .catch(error => {
            this.updateMetrics(startTime, delay);
            reject(error);
          });
      } else {
        this.updateMetrics(startTime, delay);
        resolve(result);
      }
    } catch (error) {
      this.updateMetrics(startTime, delay);
      reject(error);
    }
  }

  /**
   * Update execution metrics
   */
  private updateMetrics(startTime: number, delay: number): void {
    const executionTime = Date.now() - startTime;
    this.metrics.executedCalls++;
    this.metrics.lastExecutionTime = Date.now();
    
    // Update average delay
    const totalDelays = this.metrics.averageDelay * (this.metrics.executedCalls - 1) + delay;
    this.metrics.averageDelay = totalDelays / this.metrics.executedCalls;

    console.log(`✅ Medical function executed (delay: ${delay}ms, execution: ${executionTime}ms)`);
  }

  /**
   * Get current metrics
   */
  getMetrics(): DebounceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      debouncedCalls: 0,
      executedCalls: 0,
      emergencyBypasses: 0,
      averageDelay: 0,
      lastExecutionTime: 0
    };
  }

  /**
   * Cancel pending execution
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
      console.log('🚫 Debounced function execution cancelled');
    }
  }

  /**
   * Flush pending execution immediately
   */
  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
      console.log('⚡ Flushing debounced function execution');
    }
  }
}

/**
 * Medical Debounce Manager
 */
export class MedicalDebounceManager {
  private static debouncedFunctions = new Map<string, MedicalDebouncedFunction<any>>();

  /**
   * Create a debounced function with medical-specific configuration
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    config: DebounceConfig,
    key?: string
  ): MedicalDebouncedFunction<T> {
    const functionKey = key || func.name || 'anonymous';
    
    if (this.debouncedFunctions.has(functionKey)) {
      console.warn(`⚠️ Debounced function ${functionKey} already exists, returning existing instance`);
      return this.debouncedFunctions.get(functionKey)!;
    }

    const debouncedFunc = new MedicalDebouncedFunction(func, config);
    this.debouncedFunctions.set(functionKey, debouncedFunc);
    
    return debouncedFunc;
  }

  /**
   * Get existing debounced function
   */
  static getDebounced<T extends (...args: any[]) => any>(key: string): MedicalDebouncedFunction<T> | undefined {
    return this.debouncedFunctions.get(key);
  }

  /**
   * Cancel all pending debounced executions
   */
  static cancelAll(): void {
    console.log('🚫 Cancelling all debounced function executions');
    this.debouncedFunctions.forEach(func => func.cancel());
  }

  /**
   * Flush all pending debounced executions
   */
  static flushAll(): void {
    console.log('⚡ Flushing all debounced function executions');
    this.debouncedFunctions.forEach(func => func.flush());
  }

  /**
   * Get metrics for all debounced functions
   */
  static getAllMetrics(): Record<string, DebounceMetrics> {
    const metrics: Record<string, DebounceMetrics> = {};
    
    this.debouncedFunctions.forEach((func, key) => {
      metrics[key] = func.getMetrics();
    });
    
    return metrics;
  }

  /**
   * Reset metrics for all debounced functions
   */
  static resetAllMetrics(): void {
    console.log('🔄 Resetting all debounce metrics');
    this.debouncedFunctions.forEach(func => func.resetMetrics());
  }
}

/**
 * Medical-specific debounce presets
 */
export const MedicalDebouncePresets = {
  /**
   * For medical search queries
   */
  MEDICAL_SEARCH: {
    delay: 300,
    maxWait: 1000,
    trailing: true,
    emergencyBypass: true,
    medicalCriticality: 'MEDIUM' as const
  },

  /**
   * For patient data queries
   */
  PATIENT_DATA: {
    delay: 200,
    maxWait: 800,
    trailing: true,
    emergencyBypass: true,
    medicalCriticality: 'CRITICAL' as const
  },

  /**
   * For medical consultations
   */
  MEDICAL_CONSULTATION: {
    delay: 500,
    maxWait: 2000,
    trailing: true,
    emergencyBypass: true,
    medicalCriticality: 'HIGH' as const
  },

  /**
   * For emergency queries
   */
  EMERGENCY: {
    delay: 100,
    maxWait: 300,
    leading: true,
    trailing: false,
    emergencyBypass: true,
    medicalCriticality: 'CRITICAL' as const
  },

  /**
   * For general medical information
   */
  MEDICAL_INFO: {
    delay: 400,
    maxWait: 1500,
    trailing: true,
    emergencyBypass: false,
    medicalCriticality: 'LOW' as const
  }
} as const;

/**
 * Utility function for creating medical debounced functions
 */
export function createMedicalDebounce<T extends (...args: any[]) => any>(
  func: T,
  preset: keyof typeof MedicalDebouncePresets,
  customConfig?: Partial<DebounceConfig>
): MedicalDebouncedFunction<T> {
  const config = {
    ...MedicalDebouncePresets[preset],
    ...customConfig
  };

  return MedicalDebounceManager.debounce(func, config);
}

/**
 * React hook for medical debouncing
 */
export function useMedicalDebounce<T extends (...args: any[]) => any>(
  func: T,
  config: DebounceConfig,
  deps: React.DependencyList = []
): MedicalDebouncedFunction<T> {
  const React = require('react');
  
  return React.useMemo(() => {
    return new MedicalDebouncedFunction(func, config);
  }, deps);
}
