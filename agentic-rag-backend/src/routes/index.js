import express from 'express';
import chatRoutes from './chat.routes.js';
import healthRoutes from './health.routes.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import conversationRoutes from './conversation.routes.js';
import reportRoutes from './report.routes.js';


const router = express.Router();

/**
 * Main Router
 * 
 * Aggregates all route modules:
 * - Health routes (/, /health)
 * - Chat routes (/api/chat/*)
 * - Admin routes (/api/admin/*)
 * - Auth routes (/api/auth/*)
 * - Conversation routes (/api/conversations/*)
 * - Report routes (/api/reports/*)
 */

// Health check routes (no /api prefix)
router.use('/', healthRoutes);

// API routes
router.use('/api/auth', authRoutes);
router.use('/api', chatRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/conversations', conversationRoutes);
router.use('/api/reports', reportRoutes);

// API info endpoint
router.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Agentic RAG Backend API',
        version: '1.0.0',
        endpoints: {
            chat: {
                'POST /api/chat': 'Process chat query',
                'GET /api/chat/history': 'Get chat history (future)',
                'POST /api/chat/save': 'Save conversation (future)',
                'POST /api/chat/feedback': 'Submit feedback (future)',
            },
            reports: {
                'POST /api/reports': 'Submit bug report or feedback',
            },
            health: {
                'GET /health': 'System health status',
                'GET /api/queue/status': 'Queue statistics',
                'GET /api/stats': 'System statistics',
                'GET /api/cache/stats': 'Cache statistics',
            },
            admin: {
                'POST /api/admin/cache/clear': 'Clear cache (admin only, future)',
                'GET /api/admin/analytics': 'Get analytics (admin only, future)',
                'GET /api/admin/conversations': 'Get conversations (admin only, future)',
                'GET /api/admin/users/stats': 'User statistics (admin only, future)',
                'GET /api/admin/logs/export': 'Export logs (admin only, future)',
            },
        },
        documentation: 'See README.md for detailed API documentation',
    });
});

export default router;
