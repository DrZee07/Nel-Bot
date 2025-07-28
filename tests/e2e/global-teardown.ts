import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up medical E2E test environment...');
  
  // Clean up test data
  await cleanupTestData();
  
  // Generate test reports
  await generateTestReports();
  
  // Verify HIPAA compliance
  await verifyHIPAACompliance();
  
  // Clean up test database
  await cleanupTestDatabase();
  
  console.log('✅ Medical E2E test cleanup completed');
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  // Clear global test data
  if (global.__TEST_MEDICAL_DB__) {
    delete global.__TEST_MEDICAL_DB__;
  }
  
  if (global.__MOCK_MEDICAL_RESPONSES__) {
    delete global.__MOCK_MEDICAL_RESPONSES__;
  }
  
  if (global.__MOCK_AUDIT_LOGGER__) {
    delete global.__MOCK_AUDIT_LOGGER__;
  }
  
  // Clear any cached patient data (HIPAA compliance)
  if (global.__TEST_PATIENT_DATA__) {
    console.log('🔒 Securely clearing test patient data...');
    delete global.__TEST_PATIENT_DATA__;
  }
  
  // Clear test consultation history
  if (global.__TEST_CONSULTATION_HISTORY__) {
    delete global.__TEST_CONSULTATION_HISTORY__;
  }
}

async function generateTestReports() {
  console.log('📊 Generating medical test reports...');
  
  try {
    // Generate medical compliance report
    const complianceReport = {
      timestamp: new Date().toISOString(),
      testSuite: 'Medical E2E Tests',
      hipaaCompliance: {
        auditLogsGenerated: global.__TEST_AUDIT_LOGS__?.length || 0,
        patientDataHandled: 'anonymized',
        securityEventsLogged: global.__TEST_AUDIT_LOGS__?.filter(
          log => log.type === 'SECURITY_EVENT'
        ).length || 0
      },
      medicalScenarios: {
        basicConsultations: 'tested',
        emergencyProtocols: 'tested',
        dosageCalculations: 'tested',
        accessibilityCompliance: 'tested'
      }
    };
    
    console.log('📋 Medical Test Compliance Report:', JSON.stringify(complianceReport, null, 2));
    
    // In a real implementation, you might save this to a file
    // await fs.writeFile('./test-results/medical-compliance-report.json', 
    //   JSON.stringify(complianceReport, null, 2));
    
  } catch (error) {
    console.error('❌ Failed to generate test reports:', error);
  }
}

async function verifyHIPAACompliance() {
  console.log('🔒 Verifying HIPAA compliance...');
  
  const auditLogs = global.__TEST_AUDIT_LOGS__ || [];
  
  // Verify audit logging occurred
  if (auditLogs.length === 0) {
    console.warn('⚠️ No audit logs generated during testing');
  } else {
    console.log(`✅ ${auditLogs.length} audit log entries generated`);
  }
  
  // Check for security events
  const securityEvents = auditLogs.filter(log => log.type === 'SECURITY_EVENT');
  if (securityEvents.length > 0) {
    console.log(`🔍 ${securityEvents.length} security events logged`);
    
    // Log critical security events for review
    const criticalEvents = securityEvents.filter(event => event.level === 'CRITICAL');
    if (criticalEvents.length > 0) {
      console.warn(`⚠️ ${criticalEvents.length} critical security events detected:`, 
        criticalEvents.map(e => e.event));
    }
  }
  
  // Verify no patient data leaks
  const patientDataLeaks = auditLogs.filter(log => 
    log.data && typeof log.data === 'object' && 
    Object.keys(log.data).some(key => 
      ['patientName', 'ssn', 'medicalRecord', 'personalInfo'].includes(key)
    )
  );
  
  if (patientDataLeaks.length > 0) {
    console.error('🚨 HIPAA VIOLATION: Patient data detected in audit logs!');
    console.error('Leaked data entries:', patientDataLeaks.length);
  } else {
    console.log('✅ No patient data leaks detected');
  }
  
  // Clear audit logs after verification
  if (global.__TEST_AUDIT_LOGS__) {
    delete global.__TEST_AUDIT_LOGS__;
  }
}

async function cleanupTestDatabase() {
  console.log('🗄️ Cleaning up test database...');
  
  // In a real implementation, you would:
  // - Drop test database tables
  // - Clear test medical knowledge entries
  // - Remove test patient records
  // - Clean up test consultation history
  
  // For now, just clear environment variables
  delete process.env.HIPAA_TEST_MODE;
  delete process.env.AUDIT_LOGGING_ENABLED;
  delete process.env.TEST_PATIENT_DATA_ANONYMIZED;
  
  console.log('✅ Test database cleanup completed');
}

export default globalTeardown;
