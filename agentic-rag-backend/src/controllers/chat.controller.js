import queueService from '../services/queue.service.js';
import openaiService from '../services/openai.service.js';
import logger from '../utils/logger.js';
import { chatResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { QueueTimeoutError } from '../utils/errors.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Log from '../models/log.model.js';
import Settings from '../models/settings.model.js';
import User from '../models/user.model.js';

/**
 * Chat Controller
 */
class ChatController {
    processChat = asyncHandler(async (req, res) => {
        const { query, conversationId } = req.body;
        const userId = req.userId; // Provided by authenticateJWT

        logger.info('Processing chat request', {
            queryLength: query.length,
            userId,
            conversationId,
            requestId: req.id,
        });


        // --- Rate Limiting Logic ---
        const settings = await Settings.getSettings();
        let user = null;
        let rateLimitInfo = null;

        // Always fetch user for token tracking
        if (userId) {
            user = await User.findById(userId);
        }

        if (settings.rateLimit.enabled && user) {
            // Skip rate limiting for admins
            if (user.role === 'admin') {
                logger.info('Skipping rate limit for admin user', { userId });
            } else {
                const now = new Date();
                const resetTime = user.usage.dailyResetAt || new Date(0);

                // Check if reset needed
                if (now >= resetTime) {
                    // Reset counters
                    user.usage.dailyQueries = 0;
                    user.usage.dailyTokens = 0;
                    // Set next reset time to 24 hours from now
                    user.usage.dailyResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    await user.save();
                }

                // Check limits
                if (settings.rateLimit.type === 'requests') {
                    // Allow Limit + 1 requests as per requirement
                    const effectiveLimit = settings.rateLimit.requestLimit + 1;

                    if (user.usage.dailyQueries > effectiveLimit) {
                        return res.status(429).json({
                            success: false,
                            error: 'RATE_LIMIT_EXCEEDED',
                            message: `You have reached your daily limit of ${effectiveLimit} requests. Limits reset at ${user.usage.dailyResetAt.toLocaleString()}`,
                            limitType: 'requests',
                            current: user.usage.dailyQueries,
                            limit: effectiveLimit,
                            resetAt: user.usage.dailyResetAt
                        });
                    }
                } else if (settings.rateLimit.type === 'tokens') {
                    if (user.usage.dailyTokens > settings.rateLimit.tokenLimit) {
                        return res.status(429).json({
                            success: false,
                            error: 'RATE_LIMIT_EXCEEDED',
                            message: `You have reached your daily limit of ${settings.rateLimit.tokenLimit} tokens. Limits reset at ${user.usage.dailyResetAt.toLocaleString()}`,
                            limitType: 'tokens',
                            current: user.usage.dailyTokens,
                            limit: settings.rateLimit.tokenLimit,
                            resetAt: user.usage.dailyResetAt
                        });
                    }
                }
            }

            rateLimitInfo = {
                type: settings.rateLimit.type,
                limit: user.role === 'admin' ? 10000 : (settings.rateLimit.type === 'requests' ? (settings.rateLimit.requestLimit + 1) : settings.rateLimit.tokenLimit),
                current: settings.rateLimit.type === 'requests' ? user.usage.dailyQueries : user.usage.dailyTokens,
                resetAt: user.usage.dailyResetAt
            };
        }
        // ---------------------------

        // 1. Get or Create Conversation
        let conversation;
        if (conversationId) {
            conversation = await Conversation.findOne({ _id: conversationId, userId });
        }

        if (!conversation) {
            conversation = await Conversation.create({
                userId,
                title: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
            });
        }

        // 2. Fetch recent messages for conversation memory (last 6 = 3 exchanges)
        const recentMessages = await Message.find({
            conversationId: conversation._id
        })
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();

        const conversationHistory = recentMessages
            .reverse()
            .map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.content
            }));

        logger.debug('Fetched conversation history', {
            conversationId: conversation._id,
            historyLength: conversationHistory.length,
        });

        // 3. Save User Message
        const userMsg = await Message.create({
            conversationId: conversation._id,
            sender: 'user',
            content: query,
        });

        // 4. Add job to queue with conversation history
        const job = await queueService.addJob({
            query,
            userId: userId.toString(),
            sessionId: conversation._id.toString(),
            conversationHistory,
        });

        // 4. Wait for job completion
        // Align API timeout with Python bridge timeout (30s) + small buffer
        const timeout = 32000;
        const result = await Promise.race([
            job.finished(),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new QueueTimeoutError('Request processing timeout')),
                    timeout
                )
            ),
        ]);

        // 5. Save Bot Message
        const botMsg = await Message.create({
            conversationId: conversation._id,
            sender: 'bot',
            content: result.answer,
            metadata: {
                tokens: result.usage?.total_tokens,
                responseTime: result.elapsed,
                sources: result.contexts,
                cached: result.cached,
            },
        });

        // 6. Update Conversation lastMessageAt
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // 7. Create Activity Log
        try {
            await Log.create({
                user_id: userId,
                session_id: conversation._id.toString(),
                conversation_id: conversation._id,
                message_id: botMsg._id,
                ip_address: req.ip,
                input: query,
                output: result.answer,
                response_time: result.elapsed,
                tokens_used: result.usage?.total_tokens || 0,
                retrieval_sources: result.contexts?.length || 0,
                sections_used: result.contexts || [],
                model_used: 'agentic-rag', // or from result if available
                metadata: {
                    jobId: job.id,
                    cached: result.cached
                }
            });
        } catch (logError) {
            // Non-blocking error logging
            logger.error('Failed to create activity log', { error: logError.message });
        }


        // Update Usage Stats
        if (user) {
            // Initialize usage fields if they don't exist
            if (!user.usage) {
                user.usage = {
                    dailyQueries: 0,
                    dailyTokens: 0,
                    totalQueries: 0,
                    dailyResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                };
            }

            // Calculate tokens - use result.usage if available, otherwise estimate
            let tokensUsed = result.usage?.total_tokens || 0;

            if (!tokensUsed || tokensUsed === 0) {
                // Estimate tokens from query and answer
                const inputTokens = openaiService.estimateTokens(query);
                const outputTokens = openaiService.estimateTokens(result.answer);
                tokensUsed = inputTokens + outputTokens;

                logger.info('Estimated tokens (no usage data from Python)', {
                    inputTokens,
                    outputTokens,
                    totalEstimated: tokensUsed
                });
            }

            user.usage.dailyQueries = (user.usage.dailyQueries || 0) + 1;
            user.usage.dailyTokens = (user.usage.dailyTokens || 0) + tokensUsed;
            user.usage.totalQueries = (user.usage.totalQueries || 0) + 1;
            await user.save();

            logger.info('Token usage updated', {
                userId: user._id,
                dailyTokens: user.usage.dailyTokens,
                tokensFromResponse: result.usage?.total_tokens,
                tokensUsedThisRequest: tokensUsed
            });

            // Update rate limit info with new values
            rateLimitInfo = {
                type: settings.rateLimit.type,
                limit: user.role === 'admin' ? 10000 : (settings.rateLimit.type === 'requests' ? (settings.rateLimit.requestLimit + 1) : settings.rateLimit.tokenLimit),
                current: settings.rateLimit.type === 'requests' ? user.usage.dailyQueries : user.usage.dailyTokens,
                resetAt: user.usage.dailyResetAt
            };
        }

        logger.info('Chat request completed', {
            jobId: job.id,
            conversationId: conversation._id,
            requestId: req.id,
        });

        // Calculate session exhaustion status
        const isSessionExhausted = settings.rateLimit.enabled && user && user.role !== 'admin' && (
            (settings.rateLimit.type === 'requests' && user.usage.dailyQueries > (settings.rateLimit.requestLimit + 1)) ||
            (settings.rateLimit.type === 'tokens' && user.usage.dailyTokens > settings.rateLimit.tokenLimit)
        );

        const responseData = {
            ...chatResponse(
                result.answer,
                result.contexts,
                result.cached,
                result.elapsed,
                req.id
            ),
            conversationId: conversation._id,
            messageId: botMsg._id,
            rateLimit: rateLimitInfo,
            tokens_used: user ? (settings.rateLimit.type === 'requests' ? user.usage.dailyQueries : user.usage.dailyTokens) : 0,
            total_tokens: settings.rateLimit.enabled ? ((user && user.role === 'admin') ? 10000 : (settings.rateLimit.type === 'requests' ? (settings.rateLimit.requestLimit + 1) : settings.rateLimit.tokenLimit)) : 5000,
            session_exhausted: isSessionExhausted,
        };

        logger.info('Sending response with token data', {
            tokens_used: responseData.tokens_used,
            total_tokens: responseData.total_tokens,
            session_exhausted: responseData.session_exhausted
        });

        // Return response with IDs for feedback and rate limit info
        res.json(responseData);
    });

    /**
     * Get chat history for user (Future implementation)
     * 
     * GET /api/chat/history?page=1&limit=20&savedOnly=false
     * Requires authentication
     */
    getChatHistory = asyncHandler(async (req, res) => {
        // TODO: Implement when auth is added
        // const { page = 1, limit = 20, savedOnly = false } = req.query;
        // const userId = req.user.id;
        //
        // const result = await Conversation.getUserHistory(
        //   userId,
        //   parseInt(page),
        //   parseInt(limit),
        //   savedOnly === 'true'
        // );
        //
        // res.json(paginatedResponse(
        //   result.conversations,
        //   result.pagination.page,
        //   result.pagination.limit,
        //   result.pagination.total,
        //   'Chat history retrieved'
        // ));

        res.json({
            success: false,
            message: 'Chat history feature coming soon (requires authentication)',
            code: 'FEATURE_NOT_IMPLEMENTED',
        });
    });

    /**
     * Save a conversation (Future implementation)
     * 
     * POST /api/chat/save
     * Body: { conversationId }
     * Requires authentication
     */
    saveConversation = asyncHandler(async (req, res) => {
        // TODO: Implement when auth is added
        // const { conversationId } = req.body;
        // const userId = req.user.id;
        //
        // const conversation = await Conversation.findOne({
        //   _id: conversationId,
        //   userId,
        // });
        //
        // if (!conversation) {
        //   throw new NotFoundError('Conversation');
        // }
        //
        // await conversation.markAsSaved();
        //
        // res.json(successResponse(
        //   { conversationId },
        //   'Conversation saved successfully'
        // ));

        res.json({
            success: false,
            message: 'Save conversation feature coming soon (requires authentication)',
            code: 'FEATURE_NOT_IMPLEMENTED',
        });
    });

    /**
     * Submit feedback for a conversation (Future implementation)
     * 
     * POST /api/chat/feedback
     * Body: { conversationId, rating, comment? }
     */
    submitFeedback = asyncHandler(async (req, res) => {
        // TODO: Implement feedback system
        // const { conversationId, rating, comment } = req.body;
        //
        // const conversation = await Conversation.findById(conversationId);
        //
        // if (!conversation) {
        //   throw new NotFoundError('Conversation');
        // }
        //
        // await conversation.addFeedback(rating, comment);
        //
        // res.json(successResponse(
        //   { conversationId },
        //   'Feedback submitted successfully'
        // ));

        res.json({
            success: false,
            message: 'Feedback feature coming soon',
            code: 'FEATURE_NOT_IMPLEMENTED',
        });
    });
}

export default new ChatController();
