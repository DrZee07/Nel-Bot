import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '../middleware/audit-logger';

const router = Router();

// Initialize Supabase client with backend service key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('🚨 CRITICAL: Supabase configuration missing in backend environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Secure proxy for medical knowledge search
router.post('/search-medical-content', async (req: Request, res: Response) => {
  try {
    const { query_embedding, match_count = 5, similarity_threshold = 0.7 } = req.body;
    
    // Validate request
    if (!query_embedding || !Array.isArray(query_embedding)) {
      return res.status(400).json({
        error: 'Query embedding is required and must be an array',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log medical knowledge access
    await auditLogger.logSecurityEvent('MEDICAL_KNOWLEDGE_SEARCH', {
      embeddingDimensions: query_embedding.length,
      matchCount: match_count,
      similarityThreshold: similarity_threshold,
      ip: req.ip
    }, 'HIGH');
    
    console.log(`🔍 Medical knowledge search: ${query_embedding.length}D embedding`);
    
    // Execute secure RPC call to Supabase
    const { data, error } = await supabase.rpc('search_medical_content', {
      query_embedding,
      match_count,
      similarity_threshold
    });
    
    if (error) {
      console.error('Supabase RPC error:', error);
      throw new Error(`Medical knowledge search failed: ${error.message}`);
    }
    
    // Transform and validate response
    const results = data?.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      chapter: item.chapter,
      page: item.page,
      tags: item.tags || [],
      similarity: item.similarity || 0,
      lastUpdated: new Date(item.updated_at)
    })) || [];
    
    console.log(`✅ Medical knowledge search completed: ${results.length} results`);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
    
  } catch (error: any) {
    console.error('Medical knowledge search error:', error);
    
    // Log the error for audit purposes
    await auditLogger.logSecurityEvent('SUPABASE_SEARCH_ERROR', {
      error: error.message,
      ip: req.ip
    }, 'HIGH');
    
    res.status(500).json({
      error: 'Medical knowledge search temporarily unavailable',
      message: 'Please try again later or contact support if the issue persists',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Secure proxy for patient data operations (with enhanced security)
router.post('/patient-data', async (req: Request, res: Response) => {
  try {
    const { operation, table, data, filters } = req.body;
    
    // Validate operation type
    const allowedOperations = ['select', 'insert', 'update'];
    if (!allowedOperations.includes(operation)) {
      return res.status(400).json({
        error: 'Invalid operation. Allowed: select, insert, update',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate table access
    const allowedTables = ['patient_info', 'medical_history', 'consultations'];
    if (!allowedTables.includes(table)) {
      return res.status(403).json({
        error: 'Access to this table is not permitted',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log patient data access (CRITICAL level for HIPAA compliance)
    await auditLogger.logSecurityEvent('PATIENT_DATA_ACCESS', {
      operation,
      table,
      hasData: !!data,
      hasFilters: !!filters,
      ip: req.ip
    }, 'CRITICAL');
    
    console.log(`🏥 Patient data ${operation} on ${table}`);
    
    let result;
    
    switch (operation) {
      case 'select':
        const query = supabase.from(table).select('*');
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query.eq(key, value);
          });
        }
        result = await query;
        break;
        
      case 'insert':
        if (!data) {
          return res.status(400).json({
            error: 'Data is required for insert operation',
            timestamp: new Date().toISOString()
          });
        }
        result = await supabase.from(table).insert(data);
        break;
        
      case 'update':
        if (!data || !filters) {
          return res.status(400).json({
            error: 'Data and filters are required for update operation',
            timestamp: new Date().toISOString()
          });
        }
        const updateQuery = supabase.from(table).update(data);
        Object.entries(filters).forEach(([key, value]) => {
          updateQuery.eq(key, value);
        });
        result = await updateQuery;
        break;
    }
    
    if (result.error) {
      throw new Error(`Patient data operation failed: ${result.error.message}`);
    }
    
    console.log(`✅ Patient data ${operation} completed successfully`);
    
    res.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
    
  } catch (error: any) {
    console.error('Patient data operation error:', error);
    
    await auditLogger.logSecurityEvent('PATIENT_DATA_ERROR', {
      error: error.message,
      ip: req.ip
    }, 'CRITICAL');
    
    res.status(500).json({
      error: 'Patient data service temporarily unavailable',
      message: 'Please try again later or contact support if the issue persists',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Health check for Supabase service
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Simple test query to verify connectivity
    const { data, error } = await supabase
      .from('medical_content')
      .select('id')
      .limit(1);
    
    res.json({
      status: error ? 'unhealthy' : 'healthy',
      service: 'supabase',
      timestamp: new Date().toISOString(),
      connectivity: error ? 'disconnected' : 'connected',
      error: error?.message
    });
    
  } catch (error: any) {
    console.error('Supabase health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'supabase',
      error: 'Database connectivity issues',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as supabaseProxy };
