import crypto from 'crypto';
import { getRedisClient } from '../config/redis.js';
import logger, { logCacheOperation } from '../utils/logger.js';
import env from '../config/environment.js';

/**
 * Cache Service
 * 
 * Provides caching layer with:
 * - Redis-based caching with fallback to in-memory
 * - Automatic key generation from queries
 * - TTL management
 * - Cache statistics
 * - Graceful degradation when Redis unavailable
 */
class CacheService {
    constructor(ttl = null) {
        this.ttl = ttl || env.cacheTtl;
        this.enabled = env.cacheEnabled;
        this.redisClient = null;

        // In-memory fallback cache
        this.memoryCache = new Map();
        this.memoryCacheMaxSize = 100;

        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
        };
    }

    /**
     * Initialize cache service
     */
    async initialize() {
        this.redisClient = getRedisClient();

        if (!this.redisClient) {
            logger.warn('Cache service running in memory-only mode (Redis unavailable)');
        } else {
            logger.info('Cache service initialized with Redis');
        }
    }

    /**
     * Generate cache key from query
     * Uses MD5 hash of normalized query for consistent keys
     * 
     * @param {String} query - User query
     * @returns {String} Cache key
     */
    generateKey(query) {
        const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
        const hash = crypto.createHash('md5').update(normalized).digest('hex');
        return `chat:${hash}`;
    }

    /**
     * Get value from cache
     * 
     * @param {String} key - Cache key
     * @returns {Promise<Object|null>} Cached value or null
     */
    async get(key) {
        if (!this.enabled) {
            return null;
        }

        // --- Try Redis (isolated so errors fall through to in-memory) ---
        if (this.redisClient) {
            try {
                const value = await this.redisClient.get(key);
                if (value) {
                    this.stats.hits++;
                    logCacheOperation('hit', key, true);
                    return JSON.parse(value);
                }
            } catch (redisError) {
                this.stats.errors++;
                logger.warn('Redis GET failed, falling back to in-memory cache', {
                    key,
                    error: redisError.message,
                });
            }
        }

        // --- In-memory fallback (reached when Redis misses OR is down) ---
        try {
            if (this.memoryCache.has(key)) {
                const cached = this.memoryCache.get(key);

                // Check if expired
                if (cached.expiresAt > Date.now()) {
                    this.stats.hits++;
                    logCacheOperation('hit (memory)', key, true);
                    return cached.value;
                } else {
                    // Remove expired entry
                    this.memoryCache.delete(key);
                }
            }

            this.stats.misses++;
            logCacheOperation('miss', key, false);
            return null;
        } catch (memError) {
            this.stats.errors++;
            logger.error('In-memory cache GET error', { key, error: memError.message });
            return null;
        }
    }

    /**
     * Set value in cache
     * 
     * @param {String} key - Cache key
     * @param {Object} value - Value to cache
     * @param {Number} customTtl - Optional custom TTL in seconds
     * @returns {Promise<Boolean>} Success status
     */
    async set(key, value, customTtl = null) {
        if (!this.enabled) {
            return false;
        }

        const ttl = customTtl || this.ttl;
        const serialized = JSON.stringify(value);

        // --- Try Redis first (isolated so errors fall through to in-memory) ---
        if (this.redisClient) {
            try {
                await this.redisClient.setex(key, ttl, serialized);
                this.stats.sets++;
                logCacheOperation('set', key);
                return true;
            } catch (redisError) {
                this.stats.errors++;
                logger.warn('Redis SET failed, falling back to in-memory cache', {
                    key,
                    error: redisError.message,
                });
            }
        }

        // --- In-memory fallback (pseudo-LRU: evict oldest entry when full) ---
        try {
            if (this.memoryCache.size >= this.memoryCacheMaxSize) {
                const firstKey = this.memoryCache.keys().next().value;
                this.memoryCache.delete(firstKey);
            }

            this.memoryCache.set(key, {
                value,
                expiresAt: Date.now() + (ttl * 1000),
            });

            this.stats.sets++;
            logCacheOperation('set (memory)', key);
            return true;
        } catch (memError) {
            this.stats.errors++;
            logger.error('In-memory cache SET error', { key, error: memError.message });
            return false;
        }
    }

    /**
     * Delete value from cache
     * 
     * @param {String} key - Cache key
     * @returns {Promise<Boolean>} Success status
     */
    async delete(key) {
        try {
            // Delete from Redis
            if (this.redisClient) {
                await this.redisClient.del(key);
            }

            // Delete from memory cache
            this.memoryCache.delete(key);

            this.stats.deletes++;
            logCacheOperation('delete', key);
            return true;
        } catch (error) {
            this.stats.errors++;
            logger.error('Cache delete error', {
                key,
                error: error.message,
            });
            return false;
        }
    }

    /**
     * Clear entire cache (admin function)
     * 
     * @returns {Promise<Boolean>} Success status
     */
    async clear() {
        try {
            // Clear Redis (only chat keys)
            if (this.redisClient) {
                const keys = await this.redisClient.keys('chat:*');
                if (keys.length > 0) {
                    await this.redisClient.del(...keys);
                }
            }

            // Clear memory cache
            this.memoryCache.clear();

            logger.info('Cache cleared successfully');
            return true;
        } catch (error) {
            logger.error('Cache clear error', { error: error.message });
            return false;
        }
    }

    /**
     * Get cache statistics
     * 
     * @returns {Object} Cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            total,
            memoryCacheSize: this.memoryCache.size,
            enabled: this.enabled,
            usingRedis: !!this.redisClient,
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
        };
    }

    /**
     * Get cache size (Redis only)
     * 
     * @returns {Promise<Number|null>} Number of cached items
     */
    async getSize() {
        try {
            if (this.redisClient) {
                const keys = await this.redisClient.keys('chat:*');
                return keys.length;
            }
            return this.memoryCache.size;
        } catch (error) {
            logger.error('Cache getSize error', { error: error.message });
            return null;
        }
    }

    /**
     * Check if cache is healthy
     * 
     * @returns {Promise<Boolean>} Health status
     */
    async healthCheck() {
        try {
            const testKey = 'health:check';
            const testValue = { timestamp: Date.now() };

            await this.set(testKey, testValue, 10);
            const retrieved = await this.get(testKey);
            await this.delete(testKey);

            return retrieved !== null;
        } catch (error) {
            logger.error('Cache health check failed', { error: error.message });
            return false;
        }
    }
}

// Export singleton instance
const cacheService = new CacheService();

export default cacheService;
