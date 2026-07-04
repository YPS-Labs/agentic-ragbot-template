import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Environment configuration with validation
 * Centralizes all environment variables for easy maintenance
 */
class Environment {
  constructor() {
    this.validateRequired();
  }

  // Server Configuration
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  }

  get port() {
    return parseInt(process.env.PORT || '3000', 10);
  }

  get frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  get isDevelopment() {
    return this.nodeEnv === 'development';
  }

  get isProduction() {
    return this.nodeEnv === 'production';
  }

  // Database Configuration
  get mongoUri() {
    return process.env.MONGODB_URI;
  }

  // Redis Configuration
  get redisHost() {
    return process.env.REDIS_HOST || '127.0.0.1';
  }

  get redisPort() {
    return parseInt(process.env.REDIS_PORT || '6379', 10);
  }

  get redisPassword() {
    return process.env.REDIS_PASSWORD || '';
  }

  // Python Configuration
  get pythonPath() {
    return process.env.PYTHON_PATH || 'python3';
  }

  // API Keys
  get gptApiKey() {
    return process.env.GPT_API_KEY;
  }

  get geminiApiKey() {
    return process.env.GEMINI_API_KEY;
  }

  get tavilyApiKey() {
    return process.env.TAVILY_API_KEY;
  }

  // Cache Settings
  get cacheTtl() {
    return parseInt(process.env.CACHE_TTL || '3600', 10);
  }

  get cacheEnabled() {
    return process.env.CACHE_ENABLED !== 'false';
  }

  // Queue Configuration
  // QUEUE_ENABLED controls whether a real Redis-backed Bull queue is used.
  // This is independent of CACHE_ENABLED so queue and cache can be toggled separately.
  get queueEnabled() {
    // Defaults to true so production deployments get the real queue out of the box.
    // Set QUEUE_ENABLED=false to fall back to the synchronous in-memory MockQueue.
    return process.env.QUEUE_ENABLED !== 'false';
  }

  get queueConcurrency() {
    return parseInt(process.env.QUEUE_CONCURRENCY || '3', 10);
  }

  get queueMaxJobs() {
    return parseInt(process.env.QUEUE_MAX_JOBS || '50', 10);
  }

  get queueTimeout() {
    return parseInt(process.env.QUEUE_TIMEOUT || '35000', 10);
  }

  // Rate Limiting
  get rateLimitWindowMs() {
    return parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
  }

  get rateLimitMaxRequests() {
    return parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '50', 10);
  }

  // Authentication (Future - Google OAuth)
  get jwtSecret() {
    const secret = process.env.JWT_SECRET;

    // In production we must have a strong, explicit secret
    if (this.isProduction) {
      if (!secret) {
        throw new Error('JWT_SECRET is required in production');
      }
      if (secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production');
      }
    }

    // For development/testing, allow a weaker default but never in production
    return secret || 'dev-insecure-jwt-secret';
  }

  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '7d';
  }

  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID;
  }

  get googleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET;
  }

  get googleCallbackUrl() {
    return process.env.GOOGLE_CALLBACK_URL;
  }

  // Admin Configuration (Future)
  get adminEmails() {
    const emails = process.env.ADMIN_EMAILS || '';
    return emails.split(',').map(e => e.trim()).filter(Boolean);
  }

  get enableAnalytics() {
    return process.env.ENABLE_ANALYTICS !== 'false';
  }

  // Logging
  get logLevel() {
    return process.env.LOG_LEVEL || 'info';
  }

  get logFileMaxSize() {
    return process.env.LOG_FILE_MAX_SIZE || '10m';
  }

  get logFileMaxFiles() {
    return parseInt(process.env.LOG_FILE_MAX_FILES || '7', 10);
  }

  /**
   * Validate required environment variables
   * @throws {Error} If required variables are missing
   */
  validateRequired() {
    const required = ['MONGODB_URI'];

    // In production, enforce additional critical env vars
    if (process.env.NODE_ENV === 'production') {
      required.push(
        'JWT_SECRET',
        'GPT_API_KEY',
        'GEMINI_API_KEY',
        'TAVILY_API_KEY',
        'FRONTEND_URL',
      );
    }
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file against .env.example'
      );
    }
  }

  /**
   * Get all configuration as object (useful for debugging)
   * @returns {Object} Configuration object (sensitive values masked)
   */
  toObject() {
    return {
      nodeEnv: this.nodeEnv,
      port: this.port,
      frontendUrl: this.frontendUrl,
      redis: {
        host: this.redisHost,
        port: this.redisPort,
        hasPassword: !!this.redisPassword,
      },
      python: {
        path: this.pythonPath,
      },
      cache: {
        ttl: this.cacheTtl,
        enabled: this.cacheEnabled,
      },
      queue: {
        enabled: this.queueEnabled,
        concurrency: this.queueConcurrency,
        maxJobs: this.queueMaxJobs,
        timeout: this.queueTimeout,
      },
      rateLimit: {
        windowMs: this.rateLimitWindowMs,
        maxRequests: this.rateLimitMaxRequests,
      },
      features: {
        analytics: this.enableAnalytics,
        hasGoogleOAuth: !!(this.googleClientId && this.googleClientSecret),
      },
    };
  }
}

// Export singleton instance
export default new Environment();
