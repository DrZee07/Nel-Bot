import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Medical test environment setup
beforeAll(() => {
  console.log('🏥 Setting up medical test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITE_ENVIRONMENT = 'test';
  process.env.VITE_API_BASE_URL = 'http://localhost:3001/api';
  
  // Mock medical APIs for testing
  setupMedicalAPIMocks();
  
  // Setup HIPAA compliance testing mode
  setupHIPAATestingMode();
  
  console.log('✅ Medical test environment ready');
});

afterAll(() => {
  console.log('🧹 Cleaning up medical test environment...');
  cleanup();
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Reset medical test state
  resetMedicalTestState();
});

afterEach(() => {
  // Cleanup after each test
  cleanup();
  
  // Verify no patient data leaks in tests
  verifyNoPatientDataLeaks();
});

/**
 * Setup mock implementations for medical APIs
 */
function setupMedicalAPIMocks() {
  // Mock Mistral AI API
  vi.mock('@/lib/mistral', () => ({
    generateResponse: vi.fn().mockResolvedValue('Mock medical response'),
    createMedicalSystemPrompt: vi.fn().mockReturnValue('Mock system prompt'),
    mistral: {
      chat: {
        complete: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock medical consultation response'
            }
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300
          }
        })
      }
    }
  }));

  // Mock RAG system
  vi.mock('@/lib/rag', () => ({
    searchMedicalKnowledge: vi.fn().mockResolvedValue([
      {
        id: 'test-1',
        title: 'Test Medical Reference',
        content: 'Test medical content',
        chapter: 'Test Chapter',
        page: 123,
        tags: ['test', 'pediatric'],
        lastUpdated: new Date('2024-01-01')
      }
    ]),
    generateMedicalResponse: vi.fn().mockResolvedValue({
      response: 'Mock medical response with citations',
      citations: [
        {
          source: 'Nelson Textbook of Pediatrics, Test Chapter',
          page: 123,
          chapter: 'Test Chapter',
          relevance: 0.9
        }
      ]
    }),
    calculatePediatricDosage: vi.fn().mockImplementation(({
      drugName,
      dosePerKg,
      patientWeight,
      maxDose,
      frequency
    }) => {
      const calculatedDose = dosePerKg * patientWeight;
      const finalDose = maxDose ? Math.min(calculatedDose, maxDose) : calculatedDose;
      
      return `**${drugName} Dosage Calculation:**\n\n` +
        `- Patient weight: ${patientWeight} kg\n` +
        `- Dose per kg: ${dosePerKg} mg/kg\n` +
        `- Calculated dose: ${calculatedDose.toFixed(1)} mg\n` +
        `${maxDose ? `- Maximum dose: ${maxDose} mg\n` : ''}` +
        `- **Recommended dose: ${finalDose.toFixed(1)} mg ${frequency}**\n\n` +
        `*Always verify dosing with current guidelines and consider patient-specific factors.*`;
    })
  }));

  // Mock Supabase
  vi.mock('@/lib/supabase', () => ({
    supabase: {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'test-medical-1',
            title: 'Test Medical Knowledge',
            content: 'Test medical content for pediatric care',
            chapter: 'Pediatric Emergency Medicine',
            page: 456,
            tags: ['emergency', 'pediatric'],
            similarity: 0.85,
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        error: null
      }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        insert: vi.fn(() => ({
          data: { id: 'test-insert' },
          error: null
        })),
        update: vi.fn(() => ({
          data: { id: 'test-update' },
          error: null
        }))
      }))
    }
  }));

  // Mock fetch for external APIs
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('api-inference.huggingface.co')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(new Array(384).fill(0).map(() => Math.random()))
      });
    }
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Mock API response' })
    });
  });
}

/**
 * Setup HIPAA compliance testing mode
 */
function setupHIPAATestingMode() {
  // Mock audit logging for tests
  vi.mock('@backend/middleware/audit-logger', () => ({
    auditLogger: {
      logRequest: vi.fn().mockResolvedValue('test-request-id'),
      logResponse: vi.fn().mockResolvedValue(undefined),
      logSecurityEvent: vi.fn().mockResolvedValue(undefined)
    },
    auditLoggerMiddleware: vi.fn((req, res, next) => {
      res.locals.auditRequestId = 'test-request-id';
      next();
    })
  }));

  // Setup test data anonymization
  global.__MEDICAL_TEST_MODE__ = true;
  global.__HIPAA_COMPLIANT__ = true;
}

/**
 * Reset medical test state between tests
 */
function resetMedicalTestState() {
  // Clear any cached medical data
  if (global.__medicalTestCache__) {
    global.__medicalTestCache__.clear();
  }
  
  // Reset patient data state
  global.__testPatientData__ = null;
  
  // Reset medical consultation history
  global.__testConsultationHistory__ = [];
}

/**
 * Verify no patient data leaks in tests
 */
function verifyNoPatientDataLeaks() {
  // Check for any remaining patient data in global scope
  const sensitiveKeys = [
    'patientName',
    'patientId', 
    'medicalRecord',
    'diagnosis',
    'prescription'
  ];
  
  sensitiveKeys.forEach(key => {
    if (global[key as keyof typeof global]) {
      console.warn(`⚠️ Potential patient data leak detected: ${key}`);
      delete global[key as keyof typeof global];
    }
  });
}

// Export test utilities
export const medicalTestUtils = {
  /**
   * Create mock patient data for testing
   */
  createMockPatient: (overrides = {}) => ({
    id: 'test-patient-123',
    age: 8,
    weight: 25,
    height: 120,
    allergies: ['penicillin'],
    medications: [],
    conditions: ['asthma'],
    ...overrides
  }),

  /**
   * Create mock medical consultation
   */
  createMockConsultation: (overrides = {}) => ({
    id: 'test-consultation-456',
    patientId: 'test-patient-123',
    query: 'Test medical query about pediatric asthma',
    response: 'Test medical response with treatment recommendations',
    timestamp: new Date().toISOString(),
    citations: [
      {
        source: 'Nelson Textbook of Pediatrics',
        chapter: 'Respiratory Disorders',
        page: 789,
        relevance: 0.9
      }
    ],
    ...overrides
  }),

  /**
   * Create mock emergency scenario
   */
  createMockEmergency: (type = 'respiratory-distress') => ({
    type,
    severity: 'high',
    symptoms: ['difficulty breathing', 'wheezing'],
    vitalSigns: {
      heartRate: 120,
      respiratoryRate: 28,
      oxygenSaturation: 92,
      temperature: 37.2
    },
    protocols: [`${type}-protocol`],
    medications: ['albuterol', 'prednisolone']
  }),

  /**
   * Verify medical calculation accuracy
   */
  verifyDosageCalculation: (result: string, expected: {
    drug: string;
    weight: number;
    dosePerKg: number;
    expectedDose: number;
  }) => {
    expect(result).toContain(expected.drug);
    expect(result).toContain(`${expected.weight} kg`);
    expect(result).toContain(`${expected.dosePerKg} mg/kg`);
    expect(result).toContain(`${expected.expectedDose.toFixed(1)} mg`);
  }
};

// Global test configuration
declare global {
  var __MEDICAL_TEST_MODE__: boolean;
  var __HIPAA_COMPLIANT__: boolean;
  var __medicalTestCache__: Map<string, any>;
  var __testPatientData__: any;
  var __testConsultationHistory__: any[];
}
