import mongoose from 'mongoose';

/**
 * Log Model
 * 
 * Purpose: Store all chat interactions and activity logs
 * Used for: Admin dashboard analytics and monitoring
 */

const logSchema = new mongoose.Schema(
    {
        // User identification
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
            description: 'Reference to user who made the query',
        },

        session_id: {
            type: String,
            required: true,
            index: true,
            description: 'Chat session identifier',
        },

        conversation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            index: true,
            description: 'Reference to conversation',
        },

        message_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            index: true,
            description: 'Reference to the bot message',
        },

        // Request details
        ip_address: {
            type: String,
            description: 'Client IP address',
        },

        input: {
            type: String,
            required: true,
            description: 'User query/input',
        },

        output: {
            type: String,
            required: true,
            description: 'Bot response/output',
        },

        // Feedback tracking
        feedback: {
            type: String,
            enum: ['none', 'liked', 'disliked'],
            default: 'none',
            index: true,
            description: 'User feedback on response',
        },

        // Performance metrics
        model_used: {
            type: String,
            description: 'AI model used for response',
        },

        response_time: {
            type: Number,
            description: 'Response time in milliseconds',
        },

        tokens_used: {
            type: Number,
            default: 0,
            description: 'Total tokens consumed',
        },

        // RAG-specific fields
        retrieval_sources: {
            type: Number,
            default: 0,
            description: 'Number of sources retrieved',
        },

        sections_used: {
            type: [String],
            default: [],
            description: 'RAG sections used for response',
        },

        // Metadata
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
            description: 'Additional metadata',
        },
    },
    {
        timestamps: true,
        collection: 'logs',
    }
);

// Indexes for efficient querying
logSchema.index({ timestamp: -1 });
logSchema.index({ user_id: 1, timestamp: -1 });
logSchema.index({ feedback: 1, timestamp: -1 });
logSchema.index({ session_id: 1, timestamp: -1 });

// Static methods

/**
 * Get logs with filters and pagination
 */
logSchema.statics.getFilteredLogs = async function (filters = {}) {
    const {
        feedbackType = 'all',
        timeRange = 'all',
        startDate,
        endDate,
        page = 1,
        limit = 20,
    } = filters;

    const query = {};

    // Feedback filter
    if (feedbackType !== 'all') {
        query.feedback = feedbackType;
    }

    // Time range filter
    if (timeRange !== 'all') {
        const now = new Date();
        let startTime;

        switch (timeRange) {
            case '1h':
                startTime = new Date(now - 60 * 60 * 1000);
                break;
            case '24h':
                startTime = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = null;
        }

        if (startTime) {
            query.createdAt = { $gte: startTime };
        }
    }

    // Custom date range
    if (startDate && endDate) {
        query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await this.find(query)
        .populate('user_id', 'email profile.name')
        .populate('conversation_id', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await this.countDocuments(query);

    return {
        logs,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        filters_applied: {
            feedbackType,
            timeRange,
            startDate,
            endDate,
        },
    };
};

/**
 * Create log entry
 */
logSchema.statics.createLog = async function (logData) {
    return this.create(logData);
};

const Log = mongoose.model('Log', logSchema);

export default Log;
