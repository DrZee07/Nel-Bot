import { defineConfig, devices } from '@playwright/test';

/**
 * Medical Application E2E Testing Configuration
 * 
 * This configuration is specifically designed for testing medical applications
 * with emphasis on reliability, accessibility, and compliance requirements.
 */
export default defineConfig({
  // Test directory structure
  testDir: './tests/e2e',
  
  // Global test configuration
  fullyParallel: false, // Sequential for medical scenarios to avoid conflicts
  forbidOnly: !!process.env.CI, // Prevent .only() in CI
  retries: process.env.CI ? 2 : 1, // Retry failed tests in CI
  workers: process.env.CI ? 2 : 1, // Limited workers for medical test stability
  
  // Test execution settings
  timeout: 60000, // 60 seconds for complex medical workflows
  expect: {
    timeout: 10000, // 10 seconds for assertions
    toHaveScreenshot: {
      mode: 'only-on-failure',
      animations: 'disabled'
    }
  },
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  
  // Test reporter configuration
  reporter: [
    ['html', { 
      outputFolder: './test-results/playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: './test-results/playwright-results.json' 
    }],
    ['junit', { 
      outputFile: './test-results/playwright-junit.xml' 
    }],
    ['line'],
    // Custom medical compliance reporter
    ['./tests/utils/medical-compliance-reporter.ts']
  ],
  
  // Test output configuration
  outputDir: './test-results/playwright-artifacts',
  
  // Global test configuration
  use: {
    // Base URL for testing
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    // Browser configuration
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    
    // Medical application specific settings
    actionTimeout: 15000, // 15 seconds for medical form interactions
    navigationTimeout: 30000, // 30 seconds for medical data loading
    
    // Screenshot and video configuration
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots: true,
      sources: true
    },
    
    // Accessibility testing
    colorScheme: 'dark', // Test dark mode for medical professionals
    reducedMotion: 'reduce', // Accessibility compliance
    
    // Network and storage
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    
    // Medical data privacy
    permissions: [], // No permissions by default for privacy
    geolocation: undefined, // No location tracking
    
    // Custom context options for medical testing
    extraHTTPHeaders: {
      'X-Test-Environment': 'medical-e2e',
      'X-HIPAA-Compliant': 'true'
    }
  },
  
  // Test projects for different scenarios
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Medical professional typical setup
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Mobile devices (for emergency access)
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Emergency mobile access scenarios
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        // iOS emergency access scenarios
      },
    },
    
    // Tablet devices (common in medical settings)
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        // Medical tablet scenarios
      },
    },
    
    // Accessibility testing
    {
      name: 'accessibility-high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        forcedColors: 'active'
      },
    },
    
    // Performance testing
    {
      name: 'performance-slow-network',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow hospital network
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    }
  ],
  
  // Web server configuration for testing
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000, // 2 minutes for medical app startup
      env: {
        NODE_ENV: 'test',
        VITE_ENVIRONMENT: 'test'
      }
    },
    {
      command: 'npm run dev:backend',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60000, // 1 minute for backend startup
      env: {
        NODE_ENV: 'test'
      }
    }
  ],
  
  // Test metadata
  metadata: {
    application: 'Nel-Bot Medical Assistant',
    version: '1.0.0',
    compliance: 'HIPAA',
    testType: 'E2E Medical Scenarios',
    environment: process.env.NODE_ENV || 'test'
  }
});
