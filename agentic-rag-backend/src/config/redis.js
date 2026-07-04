import Redis from 'ioredis';
import logger from '../utils/logger.js';
import env from './environment.js';

/**
 * Redis client manager
 * Handles Redis connection with retry logic and health monitoring
 */
class RedisManager {
    constructor() {
        this.client = null;
        this.isReady = false;
    }

    /**
     * Create and configure Redis client
     * @returns {Redis} Redis client instance
     */
    createClient() {
        const options = {
            host: env.redisHost,
            port: env.redisPort,
            password: env.redisPassword || undefined,
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
            lazyConnect: true,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
                return delay;
            },
            reconnectOnError: (err) => {
                const targetErrors = ['READONLY', 'ECONNRESET'];
                if (targetErrors.some(targetError => err.message.includes(targetError))) {
                    logger.warn('Redis reconnecting on error', { error: err.message });
                    return true;
                }
                return false;
            },
        };

        const client = new Redis(options);

        // Event listeners
        client.on('connect', () => {
            logger.info('Redis client connecting...');
        });

        client.on('ready', () => {
            logger.info('✓ Redis client ready', {
                host: env.redisHost,
                port: env.redisPort,
            });
            this.isReady = true;
        });

        client.on('error', (error) => {
            logger.error('Redis client error', { error: error.message });
            this.isReady = false;
        });

        client.on('close', () => {
            logger.warn('Redis connection closed');
            this.isReady = false;
        });

        client.on('reconnecting', () => {
            logger.info('Redis client reconnecting...');
        });

        return client;
    }

    /**
     * Connect to Redis
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            if (this.client && this.isReady) {
                logger.warn('Redis already connected');
                return;
            }

            this.client = this.createClient();
            await this.client.connect();

            logger.info('Redis connection established');
        } catch (error) {
            logger.error('Redis connection failed', {
                error: error.message,
                stack: error.stack,
            });
            // Don't throw - allow app to run without Redis (degraded mode)
            logger.warn('Application will run without Redis cache');
        }
    }

    /**
     * Disconnect from Redis
     * @returns {Promise<void>}
     */
    async disconnect() {
        try {
            if (!this.client) {
                return;
            }

            await this.client.quit();
            this.isReady = false;
            logger.info('Redis disconnected gracefully');
        } catch (error) {
            logger.error('Error disconnecting from Redis', {
                error: error.message,
            });
        }
    }

    /**
     * Check Redis health
     * @returns {Promise<Object>} Health status and latency
     */
    async healthCheck() {
        try {
            if (!this.client || !this.isReady) {
                return { status: 'disconnected', latency: null };
            }

            const start = Date.now();
            await this.client.ping();
            const latency = Date.now() - start;

            return {
                status: 'ready',
                latency: `${latency}ms`,
            };
        } catch (error) {
            logger.error('Redis health check failed', { error: error.message });
            return {
                status: 'error',
                latency: null,
                error: error.message,
            };
        }
    }

    /**
     * Get Redis info
     * @returns {Promise<Object>} Redis server info
     */
    async getInfo() {
        try {
            if (!this.client || !this.isReady) {
                return { connected: false };
            }

            const info = await this.client.info();
            const dbSize = await this.client.dbsize();

            return {
                connected: true,
                ready: this.isReady,
                dbSize,
                info: this.parseRedisInfo(info),
            };
        } catch (error) {
            logger.error('Failed to get Redis info', { error: error.message });
            return { connected: false, error: error.message };
        }
    }

    /**
     * Parse Redis INFO command output
     * @param {String} info - Raw info string
     * @returns {Object} Parsed info
     */
    parseRedisInfo(info) {
        const lines = info.split('\r\n');
        const parsed = {};

        lines.forEach(line => {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split(':');
                if (key && value) {
                    parsed[key] = value;
                }
            }
        });

        return {
            version: parsed.redis_version,
            uptime: parsed.uptime_in_seconds,
            connectedClients: parsed.connected_clients,
            usedMemory: parsed.used_memory_human,
        };
    }

    /**
     * Get client instance
     * @returns {Redis|null} Redis client
     */
    getClient() {
        return this.client;
    }
}

// Export singleton instance
const redisManager = new RedisManager();

export const connectRedis = () => redisManager.connect();
export const disconnectRedis = () => redisManager.disconnect();
export const getRedisHealth = () => redisManager.healthCheck();
export const getRedisInfo = () => redisManager.getInfo();
export const getRedisClient = () => redisManager.getClient();

export default redisManager;
