import Bull from 'bull';
import logger from '../utils/logger.js';
import env from './environment.js';

/**
 * Bull Queue Configuration
 * 
 * Manages job queue for async chat processing with:
 * - Redis-backed persistence (when available)
 * - In-memory fallback (when Redis disabled)
 * - Automatic retries
 * - Job timeout handling
 * - Queue monitoring
 */

/**
 * Create a mock queue for when Redis is disabled
 * Processes jobs synchronously in-memory
 */
class MockQueue {
    constructor() {
        this.jobs = new Map();
        this.jobCounter = 0;
        this.processor = null;
        this.eventHandlers = {};
    }

    on(event, handler) {
        this.eventHandlers[event] = handler;
    }

    emit(event, ...args) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event](...args);
        }
    }

    process(concurrency, processor) {
        this.processor = processor;
    }

    async add(data, options = {}) {
        const jobId = options.jobId || `job-${++this.jobCounter}`;
        const job = {
            id: jobId,
            data,
            opts: options,
            timestamp: Date.now(),
            attemptsMade: 0,
            timestamp: Date.now(),
            attemptsMade: 0,
            progress: () => 0,
            getState: async () => 'waiting',
            returnvalue: null,
            failedReason: null,
            finished: async () => {
                if (job.failedReason) {
                    throw new Error(job.failedReason);
                }
                return job.returnvalue;
            }
        };

        this.jobs.set(jobId, job);

        // Process immediately if processor is set
        if (this.processor) {
            try {
                job.progress = (val) => val;
                job.getState = async () => 'active';
                const result = await this.processor(job);
                job.returnvalue = result;
                job.getState = async () => 'completed';
                this.emit('completed', job, result);
            } catch (error) {
                job.failedReason = error.message;
                job.getState = async () => 'failed';
                this.emit('failed', job, error);
            }
        }

        return job;
    }

    async getJob(jobId) {
        return this.jobs.get(jobId) || null;
    }

    async getWaitingCount() { return 0; }
    async getActiveCount() { return 0; }
    async getCompletedCount() { return this.jobs.size; }
    async getFailedCount() { return 0; }
    async getDelayedCount() { return 0; }
    async getPausedCount() { return 0; }

    async clean() { return []; }
    async pause() { }
    async resume() { }
    async close() { this.jobs.clear(); }
}

/**
 * Create chat processing queue
 */
const createChatQueue = () => {
    // Use MockQueue only when QUEUE_ENABLED is explicitly false.
    // This is independent of CACHE_ENABLED so caching and queuing can be toggled separately.
    if (!env.queueEnabled) {
        logger.info('✓ Chat queue initialized (in-memory MockQueue mode - QUEUE_ENABLED=false)', {
            concurrency: env.queueConcurrency,
            timeout: env.queueTimeout,
        });
        return new MockQueue();
    }

    // Redis-backed Bull queue
    const queue = new Bull('chat-processing', {
        redis: {
            host: env.redisHost,
            port: env.redisPort,
            password: env.redisPassword || undefined,
        },
        defaultJobOptions: {
            attempts: 2,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 200,
            timeout: env.queueTimeout,
        },
        settings: {
            maxStalledCount: 2,
            stalledInterval: 30000,
            lockDuration: 30000,
        },
    });

    // Event listeners for monitoring
    queue.on('error', (error) => {
        logger.error('Queue error', {
            error: error.message,
            stack: error.stack,
        });
    });

    queue.on('failed', (job, error) => {
        logger.error('Job failed', {
            jobId: job.id,
            attempts: job.attemptsMade,
            error: error.message,
            data: {
                queryLength: job.data.query?.length,
                userId: job.data.userId,
            },
        });
    });

    queue.on('completed', (job, result) => {
        logger.info('Job completed', {
            jobId: job.id,
            elapsed: result.elapsed,
            cached: result.cached,
            userId: job.data.userId,
        });
    });

    queue.on('stalled', (job) => {
        logger.warn('Job stalled', {
            jobId: job.id,
            userId: job.data.userId,
        });
    });

    queue.on('active', (job) => {
        logger.debug('Job started', {
            jobId: job.id,
            userId: job.data.userId,
        });
    });

    queue.on('waiting', (jobId) => {
        logger.debug('Job waiting', { jobId });
    });

    logger.info('✓ Chat queue initialized', {
        concurrency: env.queueConcurrency,
        timeout: env.queueTimeout,
    });

    return queue;
};

// Create and export queue instance
const chatQueue = createChatQueue();

export default chatQueue;
