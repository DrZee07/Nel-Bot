import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🏥 Setting up medical E2E test environment...');
  
  // Setup test database if needed
  await setupTestDatabase();
  
  // Setup mock medical data
  await setupMockMedicalData();
  
  // Verify backend services are running
  await verifyBackendServices();
  
  // Setup HIPAA compliance test mode
  await setupHIPAATestMode();
  
  console.log('✅ Medical E2E test environment ready');
}

async function setupTestDatabase() {
  // Initialize test database with medical knowledge
  console.log('📊 Setting up test medical database...');
  
  // This would typically involve:
  // - Creating test medical knowledge entries
  // - Setting up test patient data (anonymized)
  // - Configuring test medical protocols
  
  // For now, we'll use mock data
  global.__TEST_MEDICAL_DB__ = {
    medicalKnowledge: [
      {
        id: 'test-knowledge-1',
        title: 'Pediatric Fever Management',
        content: 'Test medical content for fever management in children...',
        chapter: 'Emergency Medicine',
        page: 123,
        tags: ['fever', 'pediatric', 'emergency']
      },
      {
        id: 'test-knowledge-2',
        title: 'Medication Dosage Guidelines',
        content: 'Test content for pediatric medication dosing...',
        chapter: 'Pharmacology',
        page: 456,
        tags: ['dosage', 'medication', 'pediatric']
      }
    ],
    emergencyProtocols: [
      {
        id: 'cpr-protocol',
        name: 'Pediatric CPR Protocol',
        steps: ['Check responsiveness', 'Call 911', 'Begin chest compressions'],
        category: 'cardiac'
      },
      {
        id: 'airway-protocol',
        name: 'Airway Management',
        steps: ['Assess airway', 'Position patient', 'Clear obstruction'],
        category: 'respiratory'
      }
    ]
  };
}

async function setupMockMedicalData() {
  console.log('🧪 Setting up mock medical data...');
  
  // Setup mock API responses for testing
  global.__MOCK_MEDICAL_RESPONSES__ = {
    'fever management': {
      response: 'For pediatric fever management, consider acetaminophen 10-15 mg/kg every 4-6 hours...',
      citations: [
        {
          source: 'Nelson Textbook of Pediatrics',
          chapter: 'Fever and Antipyretic Therapy',
          page: 1087,
          relevance: 0.95
        }
      ]
    },
    'dosage calculation': {
      response: 'Dosage calculation completed. Always verify with current guidelines.',
      citations: [
        {
          source: 'Pediatric Dosage Handbook',
          chapter: 'Dosing Guidelines',
          page: 234,
          relevance: 0.90
        }
      ]
    }
  };
}

async function verifyBackendServices() {
  console.log('🔍 Verifying backend services...');
  
  try {
    // Check if backend is running
    const response = await fetch('http://localhost:3001/api/health', {
      timeout: 5000
    });
    
    if (!response.ok) {
      console.warn('⚠️ Backend health check failed, tests may use mocks');
    } else {
      console.log('✅ Backend services are running');
    }
  } catch (error) {
    console.warn('⚠️ Backend not available, tests will use mocks:', error.message);
  }
}

async function setupHIPAATestMode() {
  console.log('🔒 Setting up HIPAA compliance test mode...');
  
  // Set environment variables for HIPAA testing
  process.env.HIPAA_TEST_MODE = 'true';
  process.env.AUDIT_LOGGING_ENABLED = 'true';
  process.env.TEST_PATIENT_DATA_ANONYMIZED = 'true';
  
  // Setup test audit logging
  global.__TEST_AUDIT_LOGS__ = [];
  
  // Mock audit logger for tests
  global.__MOCK_AUDIT_LOGGER__ = {
    logRequest: (requestData: any) => {
      global.__TEST_AUDIT_LOGS__.push({
        type: 'REQUEST',
        timestamp: new Date().toISOString(),
        data: requestData
      });
    },
    logSecurityEvent: (event: string, data: any, level: string) => {
      global.__TEST_AUDIT_LOGS__.push({
        type: 'SECURITY_EVENT',
        event,
        level,
        timestamp: new Date().toISOString(),
        data
      });
    }
  };
  
  console.log('✅ HIPAA compliance test mode enabled');
}

export default globalSetup;
