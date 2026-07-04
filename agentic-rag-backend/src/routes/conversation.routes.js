import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Log from '../models/log.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = express.Router();

// All conversation routes require authentication
router.use(authenticateJWT);

/**
 * Get all conversations for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const conversations = await Conversation.find({
            userId: req.user._id,
            isActive: true
        }).sort({ updatedAt: -1 });

        return res.json(successResponse(conversations));
    } catch (error) {
        return res.status(500).json(errorResponse(error.message));
    }
});

/**
 * Get all messages for a specific conversation
 */
router.get('/:id/messages', async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!conversation) {
            return res.status(404).json(errorResponse('Conversation not found'));
        }

        const messages = await Message.find({
            conversationId: req.params.id
        }).sort({ createdAt: 1 });

        return res.json(successResponse(messages));
    } catch (error) {
        return res.status(500).json(errorResponse(error.message));
    }
});

/**
 * Update message feedback
 */
router.patch('/messages/:messageId/feedback', async (req, res) => {
    try {
        const { feedback } = req.body;
        if (!['none', 'liked', 'disliked'].includes(feedback)) {
            return res.status(400).json(errorResponse('Invalid feedback type'));
        }

        const message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json(errorResponse('Message not found'));
        }

        // Verify ownership via conversation
        const conversation = await Conversation.findOne({
            _id: message.conversationId,
            userId: req.user._id
        });

        if (!conversation) {
            return res.status(403).json(errorResponse('Unauthorized'));
        }

        message.feedback = feedback;
        await message.save();

        console.log(`[Backend-Feedback] Message ${message._id} updated to ${feedback}`);

        // Also update the Log entry if it exists
        try {
            const updatedLog = await Log.findOneAndUpdate(
                { message_id: message._id },
                { feedback: feedback },
                { new: true }
            );
            if (updatedLog) {
                console.log(`[Backend-Feedback] Corresponding Log entry ${updatedLog._id} updated successfully`);
            } else {
                console.warn(`[Backend-Feedback] No corresponding Log entry found for message ${message._id}`);
            }
        } catch (logError) {
            console.error('[Backend-Feedback] Failed to update log feedback', logError);
        }

        return res.json(successResponse(message, 'Feedback updated successfully'));
    } catch (error) {
        return res.status(500).json(errorResponse(error.message));
    }
});

/**
 * Delete a conversation (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const conversation = await Conversation.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isActive: false },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json(errorResponse('Conversation not found'));
        }

        return res.json(successResponse(null, 'Conversation deleted successfully'));
    } catch (error) {
        return res.status(500).json(errorResponse(error.message));
    }
});

export default router;
