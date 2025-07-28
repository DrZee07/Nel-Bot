import { Router, Request, Response } from 'express';
import { Mistral } from '@mistralai/mistralai';
import { auditLogger } from '../middleware/audit-logger';

const router = Router();

// Initialize Mistral client with backend-only API key
const mistralClient = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY, // Backend-only environment variable
});

if (!process.env.MISTRAL_API_KEY) {
  console.error('🚨 CRITICAL: MISTRAL_API_KEY not found in backend environment');
  process.exit(1);
}

// Secure proxy for Mistral chat completions
router.post('/chat/completions', async (req: Request, res: Response) => {
  try {
    const { messages, temperature = 0.3, maxTokens = 2048, model = 'mistral-large-latest' } = req.body;
    
    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate message structure
    for (const message of messages) {
      if (!message.role || !message.content) {
        return res.status(400).json({
          error: 'Each message must have role and content',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        return res.status(400).json({
          error: 'Message role must be user, assistant, or system',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Log medical AI usage
    await auditLogger.logSecurityEvent('MISTRAL_API_CALL', {
      messageCount: messages.length,
      model,
      temperature,
      maxTokens,
      ip: req.ip
    }, 'HIGH');
    
    console.log(`🤖 Mistral API call: ${messages.length} messages, model: ${model}`);
    
    // Make secure API call to Mistral
    const response = await mistralClient.chat.complete({
      model,
      messages,
      temperature: Math.max(0, Math.min(1, temperature)), // Clamp temperature
      maxTokens: Math.max(1, Math.min(4096, maxTokens)), // Clamp max tokens
      safePrompt: true, // Enable safety filtering
    });
    
    const content = response.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from Mistral API');
    }
    
    // Log successful response
    console.log(`✅ Mistral response generated: ${content.length} characters`);
    
    res.json({
      success: true,
      data: {
        response: content,
        model,
        usage: response.usage,
        timestamp: new Date().toISOString(),
        requestId: res.locals.auditRequestId
      }
    });
    
  } catch (error: any) {
    console.error('Mistral API error:', error);
    
    // Log the error for audit purposes
    await auditLogger.logSecurityEvent('MISTRAL_API_ERROR', {
      error: error.message,
      ip: req.ip
    }, 'HIGH');
    
    // Return user-friendly error
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      message: 'Please try again later or contact support if the issue persists',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Health check for Mistral service
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Simple test call to verify API connectivity
    const testResponse = await mistralClient.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 1
    });
    
    res.json({
      status: 'healthy',
      service: 'mistral',
      timestamp: new Date().toISOString(),
      apiConnectivity: testResponse ? 'connected' : 'disconnected'
    });
    
  } catch (error) {
    console.error('Mistral health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'mistral',
      error: 'API connectivity issues',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as mistralProxy };
