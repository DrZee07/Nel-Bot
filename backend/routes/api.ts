import { Router } from 'express';
import { medicalRateLimit } from '../middleware/security';
import { mistralProxy } from './mistral-proxy';
import { huggingfaceProxy } from './huggingface-proxy';
import { supabaseProxy } from './supabase-proxy';

const router = Router();

// Apply medical-specific rate limiting to sensitive endpoints
const medicalLimiter = medicalRateLimit(20, 60000); // 20 requests per minute

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mistral: 'operational',
      huggingface: 'operational',
      supabase: 'operational'
    }
  });
});

// Secure proxy routes for external APIs
router.use('/mistral', medicalLimiter, mistralProxy);
router.use('/huggingface', medicalLimiter, huggingfaceProxy);
router.use('/supabase', medicalLimiter, supabaseProxy);

// Medical consultation endpoint with enhanced security
router.post('/medical/consultation', medicalLimiter, async (req, res) => {
  try {
    const { query, patientInfo, conversationHistory } = req.body;
    
    // Validate required fields
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Medical query is required and must be a string',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log medical consultation attempt
    console.log(`🏥 Medical consultation requested: ${req.ip}`);
    
    // Forward to internal medical processing
    // This would integrate with your existing RAG system
    const response = await processMedicalConsultation({
      query,
      patientInfo,
      conversationHistory,
      requestId: res.locals.auditRequestId
    });
    
    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
    
  } catch (error) {
    console.error('Medical consultation error:', error);
    res.status(500).json({
      error: 'Medical consultation service temporarily unavailable',
      message: 'Please try again later or contact support if the issue persists',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Dosage calculation endpoint
router.post('/medical/dosage', medicalLimiter, async (req, res) => {
  try {
    const { drugName, dosePerKg, patientWeight, maxDose, frequency } = req.body;
    
    // Validate dosage calculation inputs
    if (!drugName || !dosePerKg || !patientWeight || !frequency) {
      return res.status(400).json({
        error: 'Missing required dosage calculation parameters',
        required: ['drugName', 'dosePerKg', 'patientWeight', 'frequency'],
        timestamp: new Date().toISOString()
      });
    }
    
    if (typeof dosePerKg !== 'number' || typeof patientWeight !== 'number') {
      return res.status(400).json({
        error: 'Dose per kg and patient weight must be numbers',
        timestamp: new Date().toISOString()
      });
    }
    
    if (dosePerKg <= 0 || patientWeight <= 0) {
      return res.status(400).json({
        error: 'Dose per kg and patient weight must be positive numbers',
        timestamp: new Date().toISOString()
      });
    }
    
    // Calculate dosage
    const calculatedDose = dosePerKg * patientWeight;
    const finalDose = maxDose ? Math.min(calculatedDose, maxDose) : calculatedDose;
    
    const result = {
      drugName,
      patientWeight,
      dosePerKg,
      calculatedDose: Number(calculatedDose.toFixed(2)),
      maxDose,
      recommendedDose: Number(finalDose.toFixed(2)),
      frequency,
      warning: 'Always verify dosing with current guidelines and consider patient-specific factors',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    };
    
    console.log(`💊 Dosage calculation: ${drugName} for ${patientWeight}kg patient`);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dosage calculation error:', error);
    res.status(500).json({
      error: 'Dosage calculation service temporarily unavailable',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Emergency protocols endpoint
router.get('/medical/emergency/:protocol', medicalLimiter, async (req, res) => {
  try {
    const { protocol } = req.params;
    
    // This would fetch emergency protocols from your knowledge base
    const emergencyProtocol = await getEmergencyProtocol(protocol);
    
    if (!emergencyProtocol) {
      return res.status(404).json({
        error: 'Emergency protocol not found',
        availableProtocols: ['cardiac-arrest', 'anaphylaxis', 'seizure', 'respiratory-distress'],
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🚨 Emergency protocol accessed: ${protocol} by ${req.ip}`);
    
    res.json({
      success: true,
      data: emergencyProtocol,
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
    
  } catch (error) {
    console.error('Emergency protocol error:', error);
    res.status(500).json({
      error: 'Emergency protocol service temporarily unavailable',
      timestamp: new Date().toISOString(),
      requestId: res.locals.auditRequestId
    });
  }
});

// Placeholder functions - these would integrate with your existing services
async function processMedicalConsultation(params: any) {
  // This would call your existing generateMedicalResponse function
  // but through the secure backend instead of directly from frontend
  return {
    response: 'Medical consultation processed securely',
    citations: [],
    confidence: 0.85
  };
}

async function getEmergencyProtocol(protocol: string) {
  // This would fetch from your medical knowledge base
  const protocols: Record<string, any> = {
    'cardiac-arrest': {
      title: 'Pediatric Cardiac Arrest Protocol',
      steps: ['Check responsiveness', 'Call for help', 'Begin CPR'],
      medications: ['Epinephrine', 'Amiodarone'],
      dosages: 'Weight-based dosing required'
    }
  };
  
  return protocols[protocol] || null;
}

export { router as apiRouter };
