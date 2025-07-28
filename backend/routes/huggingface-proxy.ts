import { Router, Request, Response } from 'express';
import { auditLogger } from '../middleware/audit-logger';

const router = Router();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

if (!HUGGINGFACE_API_KEY) {
  console.error('🚨 CRITICAL: HUGGINGFACE_API_KEY not found in backend environment');
  process.exit(1);
}

// Secure proxy for HuggingFace embeddings
router.post('/embeddings', async (req: Request, res: Response) => {
  try {
    const { text, model = EMBEDDING_MODEL } = req.body;
    
    // Validate request
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text input is required and must be a string',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate text length (prevent abuse)
    if (text.length > 10000) {
      return res.status(400).json({
        error: 'Text input too long (max 10,000 characters)',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log embedding generation
    await auditLogger.logSecurityEvent('HUGGINGFACE_EMBEDDING_REQUEST', {
      textLength: text.length,
      model,
      ip: req.ip
    }, 'MEDIUM');
    
    console.log(`🔤 HuggingFace embedding request: ${text.length} characters`);
    
    // Make secure API call to HuggingFace
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Nel-Bot-Medical-Assistant/1.0'
        },
        body: JSON.stringify({
          inputs: text,
          options: { 
            wait_for_model: true,
            use_cache: true
          }
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
    }
    
    const embeddings = await response.json();
    
    // Validate response format
    const embeddingVector = Array.isArray(embeddings) ? embeddings : embeddings[0];
    
    if (!Array.isArray(embeddingVector)) {
      throw new Error('Invalid embedding format received from HuggingFace');
    }
    
    console.log(`✅ HuggingFace embedding generated: ${embeddingVector.length} dimensions`);
    
    res.json({
      success: true,
      data: {
        embedding: embeddingVector,
        dimensions: embeddingVector.length,
        model,
        timestamp: new Date().toISOString(),
        requestId: res.locals.auditRequestId
      }
    });
    
  } catch (error: any) {
    console.error('HuggingFace API error:', error);
    
    // Log the error for audit purposes
    await auditLogger.logSecurityEvent('HUGGINGFACE_API_ERROR', {
      error: error.message,
      ip: req.ip
    }, 'MEDIUM');
    
    // Return user-friendly error
    res.status(500).json({
      error: 'Embedding service temporarily unavailable',
      message: 'Please try again later or contact support if the issue persists',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Batch embeddings endpoint for efficiency
router.post('/embeddings/batch', async (req: Request, res: Response) => {
  try {
    const { texts, model = EMBEDDING_MODEL } = req.body;
    
    // Validate request
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({
        error: 'Texts array is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate batch size
    if (texts.length > 50) {
      return res.status(400).json({
        error: 'Batch size too large (max 50 texts)',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate each text
    for (const text of texts) {
      if (typeof text !== 'string' || text.length > 5000) {
        return res.status(400).json({
          error: 'Each text must be a string with max 5,000 characters',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    console.log(`🔤 HuggingFace batch embedding request: ${texts.length} texts`);
    
    // Process embeddings in parallel with rate limiting
    const embeddings = await Promise.all(
      texts.map(async (text, index) => {
        // Add small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Nel-Bot-Medical-Assistant/1.0'
            },
            body: JSON.stringify({
              inputs: text,
              options: { 
                wait_for_model: true,
                use_cache: true
              }
            }),
          }
        );
        
        if (!response.ok) {
          throw new Error(`HuggingFace API error for text ${index}: ${response.status}`);
        }
        
        const embedding = await response.json();
        return Array.isArray(embedding) ? embedding : embedding[0];
      })
    );
    
    console.log(`✅ HuggingFace batch embeddings generated: ${embeddings.length} vectors`);
    
    res.json({
      success: true,
      data: {
        embeddings,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
        model,
        timestamp: new Date().toISOString(),
        requestId: res.locals.auditRequestId
      }
    });
    
  } catch (error: any) {
    console.error('HuggingFace batch API error:', error);
    
    res.status(500).json({
      error: 'Batch embedding service temporarily unavailable',
      message: 'Please try again later or contact support if the issue persists',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Health check for HuggingFace service
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Simple test call to verify API connectivity
    const testResponse = await fetch(
      `https://api-inference.huggingface.co/models/${EMBEDDING_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'test',
          options: { wait_for_model: true }
        }),
      }
    );
    
    res.json({
      status: testResponse.ok ? 'healthy' : 'unhealthy',
      service: 'huggingface',
      model: EMBEDDING_MODEL,
      timestamp: new Date().toISOString(),
      apiConnectivity: testResponse.ok ? 'connected' : 'disconnected'
    });
    
  } catch (error) {
    console.error('HuggingFace health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'huggingface',
      error: 'API connectivity issues',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as huggingfaceProxy };
