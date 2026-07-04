import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import env from './environment.js';

/**
 * MongoDB connection manager
 * Handles connection lifecycle with proper error handling and reconnection
 */
class DatabaseManager {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    /**
     * Connect to MongoDB
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            if (this.isConnected) {
                logger.warn('MongoDB already connected');
                return;
            }

            const options = {
                maxPoolSize: 10,
                minPoolSize: 2,
                socketTimeoutMS: 45000,
                serverSelectionTimeoutMS: 5000,
                family: 4, // Use IPv4
            };

            logger.info('Connecting to MongoDB...');

            this.connection = await mongoose.connect(env.mongoUri, options);
            this.isConnected = true;

            logger.info('✓ MongoDB connected successfully', {
                host: this.connection.connection.host,
                database: this.connection.connection.name,
            });

            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            logger.error('MongoDB connection failed', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Setup MongoDB event listeners
     */
    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connection established');
            this.isConnected = true;
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB connection lost');
            this.isConnected = false;
        });

        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error', { error: error.message });
            this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
            this.isConnected = true;
        });
    }

    /**
     * Disconnect from MongoDB
     * @returns {Promise<void>}
     */
    async disconnect() {
        try {
            if (!this.isConnected) {
                logger.warn('MongoDB already disconnected');
                return;
            }

            await mongoose.connection.close();
            this.isConnected = false;
            logger.info('MongoDB disconnected gracefully');
        } catch (error) {
            logger.error('Error disconnecting from MongoDB', {
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Check connection health
     * @returns {Promise<Object>} Health status and latency
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected', latency: null };
            }

            const start = Date.now();
            await mongoose.connection.db.admin().ping();
            const latency = Date.now() - start;

            return {
                status: 'connected',
                latency: `${latency}ms`,
                database: mongoose.connection.name,
            };
        } catch (error) {
            logger.error('MongoDB health check failed', { error: error.message });
            return {
                status: 'error',
                latency: null,
                error: error.message,
            };
        }
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection stats
     */
    getStats() {
        if (!this.isConnected) {
            return { connected: false };
        }

        return {
            connected: true,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name,
            models: Object.keys(mongoose.connection.models),
        };
    }
}

// Export singleton instance
const dbManager = new DatabaseManager();

export const connectDB = () => dbManager.connect();
export const disconnectDB = () => dbManager.disconnect();
export const getDBHealth = () => dbManager.healthCheck();
export const getDBStats = () => dbManager.getStats();

export default dbManager;
