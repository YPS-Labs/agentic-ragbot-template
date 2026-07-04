# Agentic RAG Backend

Production-ready Node.js backend for college administration chatbot with agentic RAG pipeline.

## 🚀 Features

- ✅ **Agentic RAG Pipeline**: Multi-section query decomposition with parallel retrieval
- ✅ **Smart Caching**: Redis-based caching with in-memory fallback
- ✅ **Queue System**: Bull queue for async processing with retry logic
- ✅ **Python Integration**: Seamless bridge to existing Python RAG system
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **Health Monitoring**: Comprehensive health checks and statistics
- 🔜 **Google OAuth**: User authentication (coming soon)
- 🔜 **Chat History**: Conversation storage and retrieval (coming soon)
- 🔜 **Admin Dashboard**: Analytics and management (coming soon)

## 📋 Prerequisites

- Node.js >= 18.0.0
- Python >= 3.8
- MongoDB
- Redis (optional, has in-memory fallback)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd agentic-rag-backend
npm install
```

### 2. Install Python Dependencies

```bash
npm run python:install
# or manually:
pip install -r python_rag/requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `GPT_API_KEY` or `GEMINI_API_KEY` - LLM API key
- `TAVILY_API_KEY` - Web search API key (optional)

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Chat

- `POST /api/chat` - Process chat query
  ```json
  {
    "query": "What are the admission requirements?",
    "userId": "optional-user-id",
    "sessionId": "optional-session-id"
  }
  ```

### Health & Monitoring

- `GET /health` - System health status
- `GET /api/stats` - System statistics
- `GET /api/queue/status` - Queue statistics
- `GET /api/cache/stats` - Cache statistics

### Admin (Coming Soon)

- `POST /api/admin/cache/clear` - Clear cache
- `GET /api/admin/analytics` - Get analytics
- `GET /api/admin/conversations` - View conversations

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│      Express API Layer          │
│  (Routes, Controllers, Auth)    │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│      Service Layer               │
│  ┌────────────┐  ┌────────────┐ │
│  │   Cache    │  │   Queue    │ │
│  └────────────┘  └────────────┘ │
│  ┌────────────────────────────┐ │
│  │     Python Bridge          │ │
│  └────────────────────────────┘ │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│    Python RAG Pipeline           │
│  (Orchestrator, LLM, Retriever)  │
└──────────┬───────────────────────┘
           │
           ▼
    ┌──────────┐
    │ MongoDB  │
    │ (Vector) │
    └──────────┘
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options.

Key configurations:
- **Server**: `PORT`, `NODE_ENV`, `FRONTEND_URL`
- **Database**: `MONGODB_URI`
- **Redis**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **Cache**: `CACHE_TTL`, `CACHE_ENABLED`
- **Queue**: `QUEUE_CONCURRENCY`, `QUEUE_TIMEOUT`
- **Rate Limiting**: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`

### Future Features (Prepared)

The codebase is structured to easily add:

1. **Google OAuth Authentication**
   - User model ready
   - Auth middleware placeholders
   - JWT configuration in place

2. **Chat History**
   - Conversation model with TTL
   - Saved chats support
   - Pagination ready

3. **Admin Dashboard**
   - Analytics model
   - Admin routes prepared
   - User management ready

4. **Feedback System**
   - Feedback schema in Conversation model
   - Validation rules ready

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-07T10:30:00.000Z",
  "services": {
    "mongodb": { "status": "connected", "latency": "5ms" },
    "redis": { "status": "ready", "latency": "2ms" },
    "python": { "status": "healthy" },
    "queue": { "waiting": 0, "active": 1, "failed": 0 }
  },
  "uptime": "3600s"
}
```

### System Stats

```bash
curl http://localhost:3000/api/stats
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration
```

## 🚢 Deployment

### Docker

```bash
docker build -t agentic-rag-backend .
docker run -p 3000:3000 --env-file .env agentic-rag-backend
```

### Render.com

The project includes `render.yaml` for easy deployment to Render.

## 📝 Development

### Project Structure

```
src/
├── config/          # Configuration (DB, Redis, Queue, Env)
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/          # MongoDB models
├── routes/          # API routes
├── services/        # Business logic
│   └── python/      # Python bridge
└── utils/           # Utilities (logger, errors, responses)
```

### Adding New Features

1. **New Endpoint**: Add route → controller → service
2. **New Model**: Create in `models/` with indexes
3. **New Middleware**: Add to `middleware/` and apply in `app.js`

## 🤝 Contributing

1. Follow existing code structure
2. Add JSDoc comments
3. Handle errors properly
4. Log important operations
5. Update this README

## 📄 License

MIT

## 🙋 Support

For issues or questions, please open a GitHub issue.
