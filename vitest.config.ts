import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment configuration
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage configuration for medical application
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Medical application requires high test coverage
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Critical medical functions require 95% coverage
        './src/lib/rag.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        './src/lib/mistral.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      },
      
      // Include all source files
      include: [
        'src/**/*.{ts,tsx}',
        'backend/**/*.{ts,js}'
      ],
      
      // Exclude test files and build artifacts
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**/*',
        'backend/**/*.{test,spec}.{ts,js}',
        'dist/**/*',
        'node_modules/**/*',
        '**/*.d.ts'
      ]
    },
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'backend/**/*.{test,spec}.{ts,js}',
      'tests/unit/**/*.{test,spec}.{ts,tsx,js}',
      'tests/integration/**/*.{test,spec}.{ts,tsx,js}'
    ],
    
    // Test timeout for medical scenarios
    testTimeout: 30000, // 30 seconds for complex medical calculations
    hookTimeout: 10000, // 10 seconds for setup/teardown
    
    // Parallel execution configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Medical test categorization
    sequence: {
      shuffle: false, // Deterministic test order for medical scenarios
      concurrent: true
    },
    
    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html',
      ['junit', { outputFile: './test-results/junit.xml' }]
    ],
    
    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3001/api',
      VITE_ENVIRONMENT: 'test'
    }
  },
  
  // Path resolution for imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, './backend'),
      '@tests': path.resolve(__dirname, './tests')
    }
  },
  
  // Define constants for testing
  define: {
    __TEST__: true,
    __MEDICAL_TEST_MODE__: true
  }
});
