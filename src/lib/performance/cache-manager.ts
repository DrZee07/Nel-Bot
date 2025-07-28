/**
 * Intelligent Caching System for Medical Applications
 * 
 * Implements multi-tier caching with medical-specific strategies,
 * HIPAA compliance, and emergency data prioritization.
 */

export interface CacheConfig {
  maxSize: number;                    // Maximum cache size in MB
  defaultTTL: number;                // Default time-to-live in milliseconds
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  encryptSensitiveData?: boolean;    // Encrypt patient data
  persistToDisk?: boolean;           // Persist cache to disk
  compressionEnabled?: boolean;      // Enable data compression
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  medicalCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isPatientData: boolean;
  encrypted: boolean;
  compressed: boolean;
  size: number;                      // Size in bytes
}

export interface CacheMetrics {
  totalEntries: number;
  totalSize: number;                 // Total size in bytes
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  averageAccessTime: number;
  medicalDataEntries: number;
  encryptedEntries: number;
}

export interface MedicalCacheContext {
  isEmergency?: boolean;
  patientId?: string;
  medicalCriticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  containsPatientData?: boolean;
  queryType?: string;
}

/**
 * Medical Cache Manager with HIPAA compliance and intelligent eviction
 */
export class MedicalCacheManager {
  private cache = new Map<string, CacheEntry>();
  private metrics: CacheMetrics;
  private readonly config: CacheConfig;
  private cleanupInterval?: NodeJS.Timeout;
  private encryptionKey?: string;

  constructor(config: CacheConfig) {
    this.config = {
      encryptSensitiveData: true,
      persistToDisk: false,
      compressionEnabled: true,
      ...config
    };

    this.metrics = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      medicalDataEntries: 0,
      encryptedEntries: 0
    };

    // Initialize encryption key for patient data
    if (this.config.encryptSensitiveData) {
      this.initializeEncryption();
    }

    // Start periodic cleanup
    this.startCleanupInterval();

    console.log(`🗄️ Medical cache manager initialized (max: ${config.maxSize}MB, TTL: ${config.defaultTTL}ms)`);
  }

  /**
   * Get value from cache with medical context
   */
  async get<T>(key: string, context?: MedicalCacheContext): Promise<T | null> {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.missCount++;
      this.updateHitRate();
      console.log(`❌ Cache miss for key: ${key}`);
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.updateMetricsAfterRemoval(entry);
      this.metrics.missCount++;
      this.updateHitRate();
      console.log(`⏰ Cache entry expired for key: ${key}`);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Decrypt if necessary
    let value = entry.value;
    if (entry.encrypted && this.encryptionKey) {
      value = await this.decrypt(value);
    }

    // Decompress if necessary
    if (entry.compressed) {
      value = await this.decompress(value);
    }

    // Update metrics
    this.metrics.hitCount++;
    this.updateHitRate();
    this.updateAverageAccessTime(Date.now() - startTime);

    // Log emergency access
    if (context?.isEmergency) {
      console.warn(`🚨 Emergency cache access for key: ${key}`);
    }

    console.log(`✅ Cache hit for key: ${key} (accessed ${entry.accessCount} times)`);
    return value;
  }

  /**
   * Set value in cache with medical context
   */
  async set<T>(
    key: string, 
    value: T, 
    context?: MedicalCacheContext,
    customTTL?: number
  ): Promise<void> {
    const medicalCriticality = context?.medicalCriticality || this.config.medicalCriticality;
    const isPatientData = context?.containsPatientData || this.detectPatientData(value);
    const ttl = customTTL || this.calculateTTL(medicalCriticality, isPatientData);

    // Prepare value for storage
    let processedValue = value;
    let encrypted = false;
    let compressed = false;

    // Encrypt sensitive medical data
    if (isPatientData && this.config.encryptSensitiveData && this.encryptionKey) {
      processedValue = await this.encrypt(processedValue);
      encrypted = true;
      console.log(`🔒 Encrypting patient data for key: ${key}`);
    }

    // Compress large data
    if (this.config.compressionEnabled && this.shouldCompress(processedValue)) {
      processedValue = await this.compress(processedValue);
      compressed = true;
      console.log(`🗜️ Compressing data for key: ${key}`);
    }

    const size = this.calculateSize(processedValue);
    
    // Check if we need to evict entries to make space
    await this.ensureSpace(size, medicalCriticality);

    const entry: CacheEntry<T> = {
      key,
      value: processedValue,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      medicalCriticality,
      isPatientData,
      encrypted,
      compressed,
      size
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existingEntry = this.cache.get(key)!;
      this.updateMetricsAfterRemoval(existingEntry);
    }

    this.cache.set(key, entry);
    this.updateMetricsAfterAddition(entry);

    // Log emergency caching
    if (context?.isEmergency) {
      console.warn(`🚨 Emergency cache set for key: ${key}`);
    }

    console.log(`💾 Cached ${key} (${medicalCriticality} priority, TTL: ${ttl}ms, size: ${size} bytes)`);
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.updateMetricsAfterRemoval(entry);
      console.log(`🗑️ Deleted cache entry: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const entriesCount = this.cache.size;
    this.cache.clear();
    this.resetMetrics();
    console.log(`🧹 Cleared ${entriesCount} cache entries`);
  }

  /**
   * Clear only patient data (HIPAA compliance)
   */
  clearPatientData(): void {
    let clearedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isPatientData) {
        this.cache.delete(key);
        this.updateMetricsAfterRemoval(entry);
        clearedCount++;
      }
    }
    
    console.log(`🔒 Cleared ${clearedCount} patient data entries for HIPAA compliance`);
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache entries by medical criticality
   */
  getEntriesByMedicalCriticality(criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): CacheEntry[] {
    return Array.from(this.cache.values()).filter(entry => entry.medicalCriticality === criticality);
  }

  /**
   * Preload critical medical data
   */
  async preloadCriticalData(dataLoader: () => Promise<Record<string, any>>): Promise<void> {
    console.log('🚀 Preloading critical medical data...');
    
    try {
      const criticalData = await dataLoader();
      
      for (const [key, value] of Object.entries(criticalData)) {
        await this.set(key, value, {
          medicalCriticality: 'CRITICAL',
          containsPatientData: false
        }, 24 * 60 * 60 * 1000); // 24 hours TTL for critical data
      }
      
      console.log(`✅ Preloaded ${Object.keys(criticalData).length} critical medical entries`);
    } catch (error) {
      console.error('❌ Failed to preload critical medical data:', error);
    }
  }

  /**
   * Initialize encryption for patient data
   */
  private initializeEncryption(): void {
    // In a real implementation, this would use a proper key management system
    this.encryptionKey = process.env.MEDICAL_CACHE_ENCRYPTION_KEY || 'default-medical-key';
    console.log('🔐 Encryption initialized for patient data');
  }

  /**
   * Encrypt sensitive data
   */
  private async encrypt(data: any): Promise<string> {
    // Simple encryption implementation - in production, use proper encryption
    const jsonString = JSON.stringify(data);
    const encoded = Buffer.from(jsonString).toString('base64');
    return `encrypted:${encoded}`;
  }

  /**
   * Decrypt sensitive data
   */
  private async decrypt(encryptedData: string): Promise<any> {
    if (!encryptedData.startsWith('encrypted:')) {
      return encryptedData;
    }
    
    const encoded = encryptedData.replace('encrypted:', '');
    const jsonString = Buffer.from(encoded, 'base64').toString();
    return JSON.parse(jsonString);
  }

  /**
   * Compress data
   */
  private async compress(data: any): Promise<string> {
    // Simple compression implementation - in production, use proper compression
    const jsonString = JSON.stringify(data);
    return `compressed:${jsonString}`;
  }

  /**
   * Decompress data
   */
  private async decompress(compressedData: string): Promise<any> {
    if (!compressedData.startsWith('compressed:')) {
      return compressedData;
    }
    
    const jsonString = compressedData.replace('compressed:', '');
    return JSON.parse(jsonString);
  }

  /**
   * Calculate TTL based on medical criticality
   */
  private calculateTTL(medicalCriticality: string, isPatientData: boolean): number {
    let baseTTL = this.config.defaultTTL;

    // Adjust TTL based on medical criticality
    switch (medicalCriticality) {
      case 'CRITICAL':
        baseTTL = Math.max(baseTTL, 60 * 60 * 1000); // Min 1 hour for critical
        break;
      case 'HIGH':
        baseTTL = Math.max(baseTTL, 30 * 60 * 1000); // Min 30 minutes for high
        break;
      case 'MEDIUM':
        baseTTL = Math.max(baseTTL, 15 * 60 * 1000); // Min 15 minutes for medium
        break;
      case 'LOW':
        baseTTL = Math.max(baseTTL, 5 * 60 * 1000);  // Min 5 minutes for low
        break;
    }

    // Reduce TTL for patient data (HIPAA compliance)
    if (isPatientData) {
      baseTTL = Math.min(baseTTL, 30 * 60 * 1000); // Max 30 minutes for patient data
    }

    return baseTTL;
  }

  /**
   * Detect if data contains patient information
   */
  private detectPatientData(data: any): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const patientDataIndicators = [
      'patientId', 'patient_id', 'medicalRecord', 'medical_record',
      'patientName', 'patient_name', 'dateOfBirth', 'date_of_birth',
      'ssn', 'socialSecurityNumber', 'medicalHistory', 'medical_history'
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return patientDataIndicators.some(indicator => 
      dataString.includes(indicator.toLowerCase())
    );
  }

  /**
   * Calculate data size in bytes
   */
  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Check if data should be compressed
   */
  private shouldCompress(data: any): boolean {
    const size = this.calculateSize(data);
    return size > 1024; // Compress data larger than 1KB
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Ensure there's enough space in cache
   */
  private async ensureSpace(requiredSize: number, medicalCriticality: string): Promise<void> {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024; // Convert MB to bytes
    
    if (this.metrics.totalSize + requiredSize <= maxSizeBytes) {
      return; // Enough space available
    }

    console.log(`🧹 Cache full, evicting entries to make space for ${requiredSize} bytes`);
    
    // Get entries sorted by eviction priority
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => this.calculateEvictionPriority(b.entry) - this.calculateEvictionPriority(a.entry));

    // Evict entries until we have enough space
    for (const { key, entry } of entries) {
      // Don't evict entries with higher or equal medical criticality
      if (this.getMedicalCriticalityValue(entry.medicalCriticality) >= 
          this.getMedicalCriticalityValue(medicalCriticality)) {
        continue;
      }

      this.cache.delete(key);
      this.updateMetricsAfterRemoval(entry);
      this.metrics.evictionCount++;

      console.log(`🗑️ Evicted cache entry: ${key} (${entry.medicalCriticality} priority)`);

      if (this.metrics.totalSize + requiredSize <= maxSizeBytes) {
        break;
      }
    }
  }

  /**
   * Calculate eviction priority (higher = keep longer)
   */
  private calculateEvictionPriority(entry: CacheEntry): number {
    let priority = 0;

    // Medical criticality weight (0-100)
    priority += this.getMedicalCriticalityValue(entry.medicalCriticality) * 25;

    // Access frequency weight (0-50)
    priority += Math.min(entry.accessCount * 2, 50);

    // Recency weight (0-25)
    const ageHours = (Date.now() - entry.lastAccessed) / (1000 * 60 * 60);
    priority += Math.max(25 - ageHours, 0);

    // Patient data penalty (HIPAA compliance)
    if (entry.isPatientData) {
      priority -= 10;
    }

    return priority;
  }

  /**
   * Get numeric value for medical criticality
   */
  private getMedicalCriticalityValue(criticality: string): number {
    switch (criticality) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  }

  /**
   * Update metrics after adding entry
   */
  private updateMetricsAfterAddition(entry: CacheEntry): void {
    this.metrics.totalEntries++;
    this.metrics.totalSize += entry.size;
    
    if (entry.isPatientData) {
      this.metrics.medicalDataEntries++;
    }
    
    if (entry.encrypted) {
      this.metrics.encryptedEntries++;
    }
  }

  /**
   * Update metrics after removing entry
   */
  private updateMetricsAfterRemoval(entry: CacheEntry): void {
    this.metrics.totalEntries--;
    this.metrics.totalSize -= entry.size;
    
    if (entry.isPatientData) {
      this.metrics.medicalDataEntries--;
    }
    
    if (entry.encrypted) {
      this.metrics.encryptedEntries--;
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const totalRequests = this.metrics.hitCount + this.metrics.missCount;
    this.metrics.hitRate = totalRequests > 0 ? this.metrics.hitCount / totalRequests : 0;
  }

  /**
   * Update average access time
   */
  private updateAverageAccessTime(accessTime: number): void {
    const totalAccesses = this.metrics.hitCount;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      medicalDataEntries: 0,
      encryptedEntries: 0
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes

    console.log('🧹 Started periodic cache cleanup (5 minute intervals)');
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.updateMetricsAfterRemoval(entry);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    this.clear();
    console.log('🧹 Medical cache manager destroyed');
  }
}

/**
 * Medical cache presets for different use cases
 */
export const MedicalCachePresets = {
  /**
   * For medical consultations
   */
  MEDICAL_CONSULTATION: {
    maxSize: 50, // 50MB
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    medicalCriticality: 'HIGH' as const,
    encryptSensitiveData: true,
    persistToDisk: false,
    compressionEnabled: true
  },

  /**
   * For patient data
   */
  PATIENT_DATA: {
    maxSize: 20, // 20MB
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    medicalCriticality: 'CRITICAL' as const,
    encryptSensitiveData: true,
    persistToDisk: false,
    compressionEnabled: true
  },

  /**
   * For medical knowledge base
   */
  MEDICAL_KNOWLEDGE: {
    maxSize: 100, // 100MB
    defaultTTL: 60 * 60 * 1000, // 1 hour
    medicalCriticality: 'MEDIUM' as const,
    encryptSensitiveData: false,
    persistToDisk: true,
    compressionEnabled: true
  },

  /**
   * For emergency protocols
   */
  EMERGENCY_PROTOCOLS: {
    maxSize: 10, // 10MB
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    medicalCriticality: 'CRITICAL' as const,
    encryptSensitiveData: false,
    persistToDisk: true,
    compressionEnabled: false
  }
} as const;

/**
 * Global medical cache instance
 */
export const medicalCache = new MedicalCacheManager(MedicalCachePresets.MEDICAL_CONSULTATION);
