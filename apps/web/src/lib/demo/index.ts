/**
 * Demo Mode System
 * 
 * Exports all demo-related utilities for sample data,
 * guards, and context providers.
 */

// Sample data generators
export {
  generateSampleTrades,
  generateSampleStrategies,
  generateSampleJournals,
  calculateSampleStats,
} from './sample-data';

// Guard utilities
export {
  checkDemoStatus,
  createDemoBlockedResponse,
  isDemoFeatureAllowed,
  DEMO_RESTRICTIONS,
} from './guards';

export type { DemoCheckResult } from './guards';
