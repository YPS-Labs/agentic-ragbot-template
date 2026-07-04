import mongoose from 'mongoose';

/**
 * Analytics Model
 * 
 * Purpose: Track system usage for admin dashboard:
 * - Daily/weekly/monthly request statistics
 * - Performance metrics
 * - Cache hit rates
 * - Error tracking
 * - User activity trends
 * 
 * Note: Currently prepared but not actively used.
 * Will be activated when implementing admin dashboard.
 */

const analyticsSchema = new mongoose.Schema(
    {
        // Time period
        date: {
            type: Date,
            required: true,
            index: true,
            description: 'Date for this analytics record (daily granularity)',
        },

        period: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            default: 'daily',
            index: true,
        },

        // Request statistics
        requests: {
            total: {
                type: Number,
                default: 0,
                description: 'Total requests received',
            },
            successful: {
                type: Number,
                default: 0,
                description: 'Successfully processed requests',
            },
            failed: {
                type: Number,
                default: 0,
                description: 'Failed requests',
            },
            cached: {
                type: Number,
                default: 0,
                description: 'Requests served from cache',
            },
        },

        // Performance metrics
        performance: {
            avgResponseTime: {
                type: Number,
                default: 0,
                description: 'Average response time in ms',
            },
            minResponseTime: {
                type: Number,
                default: 0,
            },
            maxResponseTime: {
                type: Number,
                default: 0,
            },
            p95ResponseTime: {
                type: Number,
                default: 0,
                description: '95th percentile response time',
            },
        },

        // Cache statistics
        cache: {
            hitRate: {
                type: Number,
                default: 0,
                description: 'Cache hit rate percentage',
            },
            hits: {
                type: Number,
                default: 0,
            },
            misses: {
                type: Number,
                default: 0,
            },
        },

        // User statistics
        users: {
            unique: {
                type: Number,
                default: 0,
                description: 'Unique users (by userId)',
            },
            new: {
                type: Number,
                default: 0,
                description: 'New users registered',
            },
            active: {
                type: Number,
                default: 0,
                description: 'Active users (made at least one query)',
            },
        },

        // Error tracking
        errors: {
            total: {
                type: Number,
                default: 0,
            },
            byType: {
                type: Map,
                of: Number,
                default: {},
                description: 'Error counts by error type',
            },
        },

        // Query statistics
        queries: {
            avgLength: {
                type: Number,
                default: 0,
                description: 'Average query length in characters',
            },
            totalContextsRetrieved: {
                type: Number,
                default: 0,
            },
        },

        // Metadata for extensibility
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        collection: 'analytics',
    }
);

// Compound indexes
analyticsSchema.index({ date: -1, period: 1 });
analyticsSchema.index({ period: 1, date: -1 });

// Static methods

/**
 * Record a request in analytics
 */
analyticsSchema.statics.recordRequest = async function (data) {
    const {
        success,
        elapsed,
        cached,
        userId,
        error = null,
        queryLength = 0,
        contextsCount = 0,
    } = data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const update = {
        $inc: {
            'requests.total': 1,
            'requests.successful': success ? 1 : 0,
            'requests.failed': success ? 0 : 1,
            'requests.cached': cached ? 1 : 0,
            'cache.hits': cached ? 1 : 0,
            'cache.misses': cached ? 0 : 1,
        },
        $push: {
            'metadata.responseTimes': elapsed,
        },
    };

    if (error) {
        update.$inc['errors.total'] = 1;
        update.$inc[`errors.byType.${error.code || 'UNKNOWN'}`] = 1;
    }

    await this.findOneAndUpdate(
        { date: today, period: 'daily' },
        update,
        { upsert: true, new: true }
    );
};

/**
 * Get analytics for date range
 */
analyticsSchema.statics.getAnalytics = async function (startDate, endDate, period = 'daily') {
    return this.find({
        date: { $gte: startDate, $lte: endDate },
        period,
    })
        .sort({ date: 1 })
        .lean();
};

/**
 * Get summary statistics
 */
analyticsSchema.statics.getSummary = async function (days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const records = await this.find({
        date: { $gte: startDate },
        period: 'daily',
    }).lean();

    if (records.length === 0) {
        return {
            totalRequests: 0,
            successRate: 0,
            avgResponseTime: 0,
            cacheHitRate: 0,
            uniqueUsers: 0,
        };
    }

    const summary = records.reduce(
        (acc, record) => {
            acc.totalRequests += record.requests.total;
            acc.successfulRequests += record.requests.successful;
            acc.cachedRequests += record.requests.cached;
            acc.totalResponseTime += record.performance.avgResponseTime * record.requests.total;
            acc.uniqueUsers = Math.max(acc.uniqueUsers, record.users.unique);
            return acc;
        },
        {
            totalRequests: 0,
            successfulRequests: 0,
            cachedRequests: 0,
            totalResponseTime: 0,
            uniqueUsers: 0,
        }
    );

    return {
        totalRequests: summary.totalRequests,
        successRate: summary.totalRequests > 0
            ? ((summary.successfulRequests / summary.totalRequests) * 100).toFixed(2)
            : 0,
        avgResponseTime: summary.totalRequests > 0
            ? Math.round(summary.totalResponseTime / summary.totalRequests)
            : 0,
        cacheHitRate: summary.totalRequests > 0
            ? ((summary.cachedRequests / summary.totalRequests) * 100).toFixed(2)
            : 0,
        uniqueUsers: summary.uniqueUsers,
        period: `Last ${days} days`,
    };
};

/**
 * Calculate and update performance metrics
 */
analyticsSchema.statics.updatePerformanceMetrics = async function (date) {
    const record = await this.findOne({ date, period: 'daily' });

    if (!record || !record.metadata?.responseTimes) {
        return;
    }

    const times = record.metadata.responseTimes.sort((a, b) => a - b);
    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    const p95Index = Math.floor(times.length * 0.95);

    record.performance = {
        avgResponseTime: Math.round(avg),
        minResponseTime: times[0],
        maxResponseTime: times[times.length - 1],
        p95ResponseTime: times[p95Index] || times[times.length - 1],
    };

    // Calculate cache hit rate
    const totalCacheOps = record.cache.hits + record.cache.misses;
    record.cache.hitRate = totalCacheOps > 0
        ? ((record.cache.hits / totalCacheOps) * 100).toFixed(2)
        : 0;

    await record.save();
};

/**
 * Cleanup old analytics data
 */
analyticsSchema.statics.cleanup = async function (daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.deleteMany({
        date: { $lt: cutoffDate },
        period: 'daily',
    });

    return result.deletedCount;
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
