/**
 * Fail-Fast Environment Validation Script
 * Verifies all critical configuration before server boot in production & Docker
 */

export function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. JWT Secret (Critical for production auth security)
  if (!process.env.JWT_SECRET) {
    if (isProduction) {
      errors.push('CRITICAL: JWT_SECRET environment variable is missing in production.');
    } else {
      warnings.push('WARNING: JWT_SECRET not configured; defaulting to development HMAC key.');
    }
  } else if (process.env.JWT_SECRET.length < 32) {
    warnings.push('SECURITY NOTICE: JWT_SECRET is shorter than 32 characters; recommend 256-bit entropy.');
  }

  // 2. Gemini API Key (Warning only because deterministic Socratic fallbacks are supported)
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    warnings.push('AI NOTICE: GEMINI_API_KEY is not configured. Local deterministic Socratic fallbacks will be active.');
  }

  // 3. Port Validation
  const port = Number(process.env.PORT) || 3000;
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`INVALID CONFIG: PORT "${process.env.PORT}" must be a valid integer between 1 and 65535.`);
  }

  // Print diagnostics
  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`[CONFIG] ${w}`));
  }

  if (errors.length > 0) {
    console.error('================================================================');
    console.error('FATAL: Mastery.ai Environment Configuration Validation Failed');
    console.error('================================================================');
    errors.forEach(err => console.error(` ✖ ${err}`));
    console.error('================================================================');
    process.exit(1);
  }

  console.log(`[CONFIG] Environment validation passed. Node Environment: ${process.env.NODE_ENV || 'development'}, Port: ${port}`);
}

if (process.argv[1]?.includes('validateEnv')) {
  validateEnvironment();
}
