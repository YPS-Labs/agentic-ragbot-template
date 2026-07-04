# NMIET RAG Chatbot System

An intelligent chatbot system for Nutan Maharashtra Institute of Engineering & Technology (NMIET) built with Agentic RAG technology.

![Status](https://img.shields.io/badge/status-ready%20for%20testing-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🎯 Overview

This project provides an AI-powered chatbot assistant for NMIET students, faculty, and prospective applicants. It features:

- **Intelligent Q&A** using Retrieval-Augmented Generation (RAG)
- **Multi-section document retrieval** from college databases
- **Google OAuth authentication** with guest access
- **Admin dashboard** for monitoring and analytics
- **Modern, responsive UI** inspired by GeeksforGeeks

---

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │  (Port 5173)
│  - GFG-style UI │
│  - Auth Context │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Node.js API    │  (Port 3000)
│  - Express      │
│  - MongoDB      │
│  - Redis Cache  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Python RAG     │  (Port 8000)
│  - LangChain    │
│  - Vector DB    │
└─────────────────┘
```

---

## ✨ Features

### For Users
- 🔐 **Secure Login** - Google OAuth or Guest access
- 🔍 **Smart Search** - GFG-inspired search interface
- 💬 **AI Chat** - Context-aware responses with typing animation
- 👍 **Feedback** - Like/Dislike system for responses
- 📱 **Responsive** - Works on desktop, tablet, and mobile

### For Admins
- 📊 **Logs Dashboard** - Monitor all chat interactions
- 🔍 **Advanced Filters** - Filter by time, feedback, user
- 📈 **Analytics** - Track usage patterns and performance
- 📄 **Export** - Download logs for analysis

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Python 3.9+
- Google Cloud Console account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd FYP
```

2. **Setup Google OAuth**
   - Follow instructions in [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)

3. **Configure Backend**
```bash
cd agentic-rag-backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

4. **Configure Frontend**
```bash
cd agentic-rag-frontend
npm install
# Create .env with VITE_GOOGLE_CLIENT_ID
npm run dev
```

5. **Access Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

---

## 📚 Documentation

- **[Setup Guide](./SETUP_GUIDE.md)** - Detailed setup instructions
- **[Setup Guide](./SETUP_GUIDE.md)** - Detailed setup instructions

---

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- React Router
- Google OAuth
- CSS3

### Backend
- Node.js
- Express
- MongoDB
- Redis
- JWT

### AI/ML
- Python
- LangChain
- OpenAI GPT
- Google Gemini
- Vector Database

---

## 👥 Team

- **Shantanu Vhanmore** - Full Stack Developer & Project Lead
- **Pooja** - Frontend Developer
- **Yasir** - Backend Developer

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📞 Support

For issues or questions:
- Email: shantanuvhanmore@gmail.com
- Create an issue in the repository

---

**Built with ❤️ for NMIET**
