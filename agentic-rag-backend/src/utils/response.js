/**
 * Standard API response helpers
 * Ensures consistent response format across all endpoints
 */

/**
 * Success response format
 * @param {Object} data - Response data
 * @param {String} message - Optional success message
 * @param {Object} metadata - Optional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 */
export const successResponse = (data, message = 'Success', metadata = null) => {
    const response = {
        success: true,
        message,
        data,
    };

    if (metadata) {
        response.metadata = metadata;
    }

    return response;
};

/**
 * Error response format
 * @param {String} message - Error message
 * @param {String} code - Error code
 * @param {Object} details - Optional error details
 * @param {Number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
export const errorResponse = (
    message,
    code = 'ERROR',
    details = null,
    statusCode = 500
) => {
    const response = {
        success: false,
        error: {
            message,
            code,
            statusCode,
        },
    };

    if (details) {
        response.error.details = details;
    }

    return response;
};

/**
 * Paginated response format (for future chat history, conversations, etc.)
 * @param {Array} items - Array of items
 * @param {Number} page - Current page number
 * @param {Number} limit - Items per page
 * @param {Number} total - Total number of items
 * @param {String} message - Optional message
 * @returns {Object} Formatted paginated response
 */
export const paginatedResponse = (
    items,
    page,
    limit,
    total,
    message = 'Success'
) => {
    const totalPages = Math.ceil(total / limit);

    return {
        success: true,
        message,
        data: items,
        metadata: {
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        },
    };
};

/**
 * Chat response format (specialized for chat endpoints)
 * @param {String} answer - Generated answer
 * @param {Array} contexts - Source contexts used
 * @param {Boolean} cached - Whether response was cached
 * @param {Number} elapsed - Processing time in ms
 * @param {String} requestId - Request correlation ID
 * @returns {Object} Formatted chat response
 */
export const chatResponse = (answer, contexts, cached, elapsed, requestId) => {
    return {
        success: true,
        data: {
            answer,
            contexts,
            cached,
            elapsed: `${elapsed}ms`,
        },
        requestId,
    };
};

/**
 * Health check response format
 * @param {String} status - Overall health status
 * @param {Object} services - Individual service statuses
 * @param {Number} uptime - Server uptime in seconds
 * @returns {Object} Formatted health response
 */
export const healthResponse = (status, services, uptime) => {
    return {
        status,
        timestamp: new Date().toISOString(),
        services,
        uptime: `${Math.floor(uptime)}s`,
    };
};

/**
 * Analytics response format (for future admin dashboard)
 * @param {Object} stats - Analytics statistics
 * @param {String} period - Time period (daily, weekly, monthly)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Formatted analytics response
 */
export const analyticsResponse = (stats, period, startDate, endDate) => {
    return {
        success: true,
        data: stats,
        metadata: {
            period,
            dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            },
        },
    };
};

/**
 * Queue stats response format
 * @param {Object} stats - Queue statistics
 * @returns {Object} Formatted queue stats response
 */
export const queueStatsResponse = (stats) => {
    return {
        success: true,
        data: {
            queue: stats,
            timestamp: new Date().toISOString(),
        },
    };
};
