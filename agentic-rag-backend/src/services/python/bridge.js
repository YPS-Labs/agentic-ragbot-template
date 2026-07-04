import { PythonShell } from 'python-shell';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger, { logPythonExecution } from '../../utils/logger.js';
import { PythonExecutionError, ValidationError } from '../../utils/errors.js';
import env from '../../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Python Bridge Service
 * 
 * Executes Python RAG pipeline from Node.js with:
 * - Timeout handling
 * - Retry logic
 * - Error parsing and reporting
 * - Performance tracking
 * - Health monitoring
 */
class PythonBridge {
    constructor(options = {}) {
        this.pythonPath = options.pythonPath || env.pythonPath;
        this.scriptPath = join(__dirname, '../../../python_rag');
        this.scriptName = 'orchestrator_wrapper.py';
        this.timeout = options.timeout || 30000; // 30 seconds
        this.maxRetries = options.maxRetries || 1;

        this.shell = null;
        this.requestQueue = [];
        this.isProcessing = false;
        this.isReady = false;

        // Track execution statistics
        this.stats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalElapsed: 0,
            avgElapsed: 0,
        };

        // Initialize persistent process
        this._initShell();
    }

    /**
     * Execute Python RAG pipeline for a query
     * 
     * @param {String} query - User query
     * @param {String} userId - User identifier
     * @param {Array} conversationHistory - Recent messages for context
     * @returns {Promise<Object>} Response with answer, contexts, and metadata
     */
    async executeQuery(query, userId = 'anonymous', conversationHistory = []) {
        // Validation
        if (!query || typeof query !== 'string' || !query.trim()) {
            throw new ValidationError('Query must be a non-empty string');
        }

        if (query.length > 2000) {
            throw new ValidationError('Query exceeds maximum length of 2000 characters');
        }

        const startTime = Date.now();
        let attempt = 0;
        let lastError = null;

        while (attempt <= this.maxRetries) {
            try {
                attempt++;

                logger.info('Executing Python RAG pipeline', {
                    attempt,
                    queryLength: query.length,
                    userId,
                    historyLength: conversationHistory.length,
                });

                const result = await this._executePython(query, userId, conversationHistory);

                const elapsed = Date.now() - startTime;

                // Update statistics
                this._updateStats(true, elapsed);

                logPythonExecution(query, elapsed, true);

                return {
                    ...result,
                    elapsed,
                    success: true,
                };

            } catch (error) {
                lastError = error;

                if (attempt <= this.maxRetries) {
                    logger.warn(`Python execution failed, retrying (${attempt}/${this.maxRetries})`, {
                        error: error.message,
                    });

                    // Exponential backoff
                    await this._sleep(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
                }
            }
        }

        // All retries failed
        const elapsed = Date.now() - startTime;
        this._updateStats(false, elapsed);
        logPythonExecution(query, elapsed, false, lastError);

        throw new PythonExecutionError(
            `Python execution failed after ${attempt} attempts: ${lastError.message}`,
            {
                attempts: attempt,
                lastError: lastError.message,
                elapsed,
            }
        );
    }



    /**
     * Initialize the persistent Python shell
     * @private
     */
    _initShell() {
        if (this.shell) {
            try {
                this.shell.kill();
            } catch (e) { /* ignore */ }
        }

        const options = {
            mode: 'text',
            pythonPath: this.pythonPath,
            pythonOptions: ['-u'], // Unbuffered output
            scriptPath: this.scriptPath,
            args: ['--interactive'],
        };

        logger.info('Initializing Python RAG process...');
        this.shell = new PythonShell(this.scriptName, options);
        this.isReady = false;

        this.shell.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                // Check for initial ready message
                if (!this.isReady && data.success && data.message === 'Ready') {
                    this.isReady = true;
                    logger.info('Python RAG process ready');
                    this._processQueue();
                    return;
                }

                // Handle response for current request
                const currentRequest = this.currentRequest;
                if (currentRequest) {
                    this.currentRequest = null;
                    this.isProcessing = false;

                    if (data.success) {
                        currentRequest.resolve(data);
                    } else {
                        currentRequest.reject(new PythonExecutionError(
                            data.error?.message || 'Unknown Python error',
                            data.error
                        ));
                    }

                    // Process next in queue
                    setImmediate(() => this._processQueue());
                }
            } catch (err) {
                logger.error('Error parsing Python output:', { error: err.message, output: message });
            }
        });

        this.shell.on('stderr', (stderr) => {
            // Log stderr but don't treat as fatal unless process exits
            logger.warn('Python stderr:', { output: stderr });
        });

        this.shell.on('error', (err) => {
            logger.error('Python process error:', err);
            this._handleProcessDeath();
        });

        this.shell.on('close', () => {
            logger.warn('Python process closed unexpectedly');
            this._handleProcessDeath();
        });
    }

    /**
     * Handle process crash/exit
     * @private
     */
    _handleProcessDeath() {
        this.isReady = false;
        this.isProcessing = false;
        this.shell = null;

        // Reject current request if any
        if (this.currentRequest) {
            this.currentRequest.reject(new PythonExecutionError('Python process crashed'));
            this.currentRequest = null;
        }

        // Restart process after delay
        setTimeout(() => this._initShell(), 1000);
    }

    /**
     * Process the next request in the queue
     * @private
     */
    _processQueue() {
        if (!this.isReady || this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        const request = this.requestQueue.shift();
        this.currentRequest = request;
        this.isProcessing = true;

        const payload = JSON.stringify({
            query: request.query,
            userId: request.userId,
            conversationHistory: request.conversationHistory || []
        });

        try {
            this.shell.send(payload);

            // Set timeout for this specific request
            request.timeoutId = setTimeout(() => {
                if (this.currentRequest === request) {
                    request.reject(new PythonExecutionError('Python execution timeout', { timeout: this.timeout }));
                    // Force kill and restart process on hanging timeout to clear state
                    this._handleProcessDeath();
                }
            }, this.timeout);

        } catch (err) {
            request.reject(err);
            this.currentRequest = null;
            this.isProcessing = false;
            this._processQueue();
        }
    }

    /**
     * Execute Python script via persistent shell
     * 
     * @private
     * @param {String} query - User query
     * @param {String} userId - User identifier
     * @param {Array} conversationHistory - Recent messages for context
     * @returns {Promise<Object>} Parsed response
     */
    async _executePython(query, userId, conversationHistory = []) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                query,
                userId,
                conversationHistory,
                resolve,
                reject
            });
            this._processQueue();
        });
    }

    /**
     * Health check - test Python execution
     * 
     * @returns {Promise<Boolean>} Health status
     */
    async healthCheck() {
        try {
            const testQuery = 'where to check scholarship status on mahadbt website';
            const result = await this.executeQuery(testQuery, 'health-check');

            return result.success === true;
        } catch (error) {
            logger.error('Python health check failed', {
                error: error.message,
            });
            return false;
        }
    }

    /**
     * Get execution statistics
     * 
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalExecutions > 0
                ? ((this.stats.successfulExecutions / this.stats.totalExecutions) * 100).toFixed(2) + '%'
                : '0%',
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalElapsed: 0,
            avgElapsed: 0,
        };
    }

    /**
     * Update execution statistics
     * 
     * @private
     * @param {Boolean} success - Execution success
     * @param {Number} elapsed - Execution time in ms
     */
    _updateStats(success, elapsed) {
        this.stats.totalExecutions++;

        if (success) {
            this.stats.successfulExecutions++;
        } else {
            this.stats.failedExecutions++;
        }

        this.stats.totalElapsed += elapsed;
        this.stats.avgElapsed = Math.round(
            this.stats.totalElapsed / this.stats.totalExecutions
        );
    }

    /**
     * Sleep helper for retry backoff
     * 
     * @private
     * @param {Number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
const pythonBridge = new PythonBridge();

export default pythonBridge;
