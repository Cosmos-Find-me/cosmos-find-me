/**
 * Vitest configuration specifically for performance regression tests
 * Based on 2024 React testing best practices
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Focus on performance tests
    include: [
      'src/**/__tests__/*performance*.test.{ts,tsx}',
      'src/**/__tests__/*infiniteLoop*.test.{ts,tsx}',
      'src/**/__tests__/*ApiCallMonitoring*.test.{ts,tsx}'
    ],
    
    // Set stricter timeouts to catch infinite loops faster
    testTimeout: 10000, // 10 seconds max per test
    
    // Enable additional debugging for performance issues
    reporters: ['verbose'],
    
    // Make test globals available
    globals: true,
    
    // Custom test environment with performance monitoring
    setupFiles: [
      './src/utils/performanceTestSetup.ts'
    ],
    
    // Fail fast on infinite loops
    bail: 1,
    
    // Memory and timing limits
    pool: 'forks',
    maxWorkers: 1, // Single worker to better detect performance issues
    
    // Environment setup
    environment: 'jsdom',
  }
});