/**
 * Feature flags configuration
 * Controls which features are enabled in different environments
 */

export const featureFlags = {
  // Credits system
  enableCredits: process.env.NODE_ENV === 'production' && process.env.DISABLE_CREDITS !== 'true',
  
  // Email collection
  enableEmailSignup: process.env.NODE_ENV === 'production' && process.env.DISABLE_CREDITS !== 'true',
  
  // Training data collection (always enabled)
  enableTrainingData: true,
  
  // Admin dashboard (always enabled for monitoring)
  enableAdminDashboard: true,
  
  // Rate limiting (always enabled for security)
  enableRateLimit: true,
  
  // Development helpers
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

export default featureFlags;
