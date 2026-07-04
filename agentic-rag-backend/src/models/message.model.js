import mongoose from 'mongoose';

/**
 * Message Model
 * Represents individual messages within a conversation
 */
const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        sender: {
            type: String,
            enum: ['user', 'bot'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        feedback: {
            type: String,
            enum: ['none', 'liked', 'disliked'],
            default: 'none',
        },
        metadata: {
            tokens: Number,
            responseTime: Number,
            sources: [String],
            cached: Boolean,
        },
    },
    {
        timestamps: true,
        collection: 'messages',
    }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
