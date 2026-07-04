import { encoding_for_model } from 'tiktoken';
import logger from '../utils/logger.js';

/**
 * OpenAI Service
 * 
 * Provides token estimation and management for GPT models
 * Uses tiktoken for accurate token counting
 */
class OpenAIService {
    constructor() {
        this.modelName = 'gpt-4o-mini';
        this.encoder = null;
        this._initEncoder();
    }

    /**
     * Initialize tiktoken encoder
     * @private
     */
    _initEncoder() {
        try {
            this.encoder = encoding_for_model(this.modelName);
            logger.info('Tiktoken encoder initialized', { model: this.modelName });
        } catch (error) {
            logger.error('Failed to initialize tiktoken encoder', { error: error.message });
            // Fallback: will use rough estimation
            this.encoder = null;
        }
    }

    /**
     * Estimate tokens for a given text
     * 
     * @param {String} text - Text to estimate tokens for
     * @returns {Number} Estimated token count
     */
    estimateTokens(text) {
        if (!text || typeof text !== 'string') {
            return 0;
        }

        try {
            if (this.encoder) {
                const tokens = this.encoder.encode(text);
                return tokens.length;
            } else {
                // Fallback: rough estimation (1 token ≈ 4 characters)
                return Math.ceil(text.length / 4);
            }
        } catch (error) {
            logger.warn('Token estimation failed, using fallback', { error: error.message });
            return Math.ceil(text.length / 4);
        }
    }

    /**
     * Estimate tokens for conversation history
     * 
     * @param {Array} conversationHistory - Array of {role, content} messages
     * @returns {Number} Total estimated tokens
     */
    estimateConversationTokens(conversationHistory = []) {
        if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
            return 0;
        }

        let totalTokens = 0;

        for (const message of conversationHistory) {
            // Each message has overhead: role, content, formatting
            totalTokens += 4; // Message overhead
            totalTokens += this.estimateTokens(message.role || '');
            totalTokens += this.estimateTokens(message.content || '');
        }

        // Add overhead for the conversation structure
        totalTokens += 3; // Conversation overhead

        return totalTokens;
    }

    /**
     * Calculate total tokens for a chat request
     * 
     * @param {String} userMessage - Current user message
     * @param {Array} conversationHistory - Previous messages
     * @param {String} systemPrompt - System prompt (optional)
     * @returns {Number} Total input tokens
     */
    calculateInputTokens(userMessage, conversationHistory = [], systemPrompt = '') {
        let totalTokens = 0;

        // System prompt tokens
        if (systemPrompt) {
            totalTokens += this.estimateTokens(systemPrompt);
            totalTokens += 4; // Message overhead
        }

        // Conversation history tokens
        totalTokens += this.estimateConversationTokens(conversationHistory);

        // Current user message tokens
        totalTokens += this.estimateTokens(userMessage);
        totalTokens += 4; // Message overhead

        return totalTokens;
    }

    /**
     * Extract token usage from GPT API response
     * 
     * @param {Object} response - Response from Python RAG pipeline
     * @returns {Object} Token usage breakdown
     */
    extractTokenUsage(response) {
        // The Python RAG pipeline should return usage data
        const usage = response.usage || {};

        return {
            inputTokens: usage.prompt_tokens || 0,
            outputTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
        };
    }

    /**
     * Free encoder resources
     */
    cleanup() {
        if (this.encoder) {
            this.encoder.free();
            this.encoder = null;
        }
    }
}

// Export singleton instance
const openaiService = new OpenAIService();

export default openaiService;
