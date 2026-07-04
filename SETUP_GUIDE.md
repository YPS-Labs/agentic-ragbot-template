# Backend-Frontend Integration Setup Guide

## 🎯 Overview
This guide will help you set up the complete NMIET RAG Chatbot system with backend-frontend integration, admin dashboard, and modern UI.

---

## 📋 Prerequisites
- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Redis running (optional, for caching)
- Python 3.9+ (for RAG pipeline)
- Google Cloud Console account

---

## 🔧 Part 1: Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click project dropdown (top-left) → **New Project**
3. Project name: `NMIET-RAG-Chatbot`
4. Click **Create**

### Step 2: Configure OAuth Consent Screen
1. Navigate: **APIs & Services** → **OAuth consent screen**
2. User Type: **External** → Create
3. Fill App Information:
   - App name: `NMIET RAG Chatbot`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue** through all steps
5. (Optional) Click **Publish App**

### Step 3: Create OAuth Credentials
1. Navigate: **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `NMIET RAG Frontend`
5. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:3000`
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
7. Click **Create**
8. **COPY the Client ID and Client Secret**

---

## 🔧 Part 2: Backend Setup

### Step 1: Install Dependencies
```bash
cd agentic-rag-backend
npm install google-auth-library jsonwebtoken
```

### Step 2: Update .env File
Edit `agentic-rag-backend/.env`:
```env
# Add these lines (keep existing ones)
GOOGLE_CLIENT_ID=your-client-id-from-step-3
GOOGLE_CLIENT_SECRET=your-client-secret-from-step-3
JWT_SECRET=your-secure-random-string-here
ADMIN_EMAILS=shantanuvhanmore@gmail.com
```

**Generate JWT Secret:**
```bash
# Run this in terminal to generate a secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 3: Start Backend
```bash
npm run dev
```

Backend should start on `http://localhost:3000`

---

## 🔧 Part 3: Frontend Setup

### Step 1: Install Dependencies
```bash
cd agentic-rag-frontend
npm install @react-oauth/google react-router-dom react-icons
```

### Step 2: Update .env File
Edit `agentic-rag-frontend/.env`:
```env
VITE_API_BASE=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-client-id-from-google-oauth-setup
```

### Step 3: Start Frontend
```bash
npm run dev
```

Frontend should start on `http://localhost:5173`

---

## 🧪 Testing the Application

### Test 1: Authentication
1. Open `http://localhost:5173`
2. You should be redirected to `/login`
3. Click **"Continue as Guest"** → Should login and redirect to home
4. Logout and try **Google Sign In** → Should work if credentials are correct

### Test 2: Admin Access
1. Login with `shantanuvhanmore@gmail.com` (via Google)
2. Check SubHeader → Should see **"Admin Dashboard"** link
3. Click Admin Dashboard → Should load logs page
4. Try filters (1h, 24h, 7d) and feedback filters

### Test 3: Chat Functionality
1. On Home page, enter a query in search bar
2. Chat interface should appear
3. Send messages → Should get responses from backend
4. Like/Dislike buttons should appear after bot response

### Test 4: Navigation
1. Test all navigation links: Home, About Us, Contact Us
2. Check SubSubHeader dropdowns work
3. Verify responsive design on mobile

---

## 🎨 Features Implemented

### ✅ Backend
- JWT authentication with Google OAuth
- Guest login support
- Admin role assignment via ADMIN_EMAILS
- Log model with comprehensive fields
- Admin logs API with filters (time, feedback)
- Protected routes with middleware

### ✅ Frontend
- NMIET-branded header with logos
- GFG-inspired navigation (SubHeader + SubSubHeader)
- Home page with search interface
- Chat interface with typing animation
- About Us page with college + project info
- Contact Us page with developer cards
- Admin Dashboard with scrollable logs table
- Login page with Google OAuth + Guest option
- Protected routes
- Modern light theme with polished UI

---

## 📁 Project Structure

```
agentic-rag-backend/
├── src/
│   ├── controllers/
│   │   └── auth.controller.js (NEW)
│   ├── middleware/
│   │   └── auth.middleware.js (UPDATED)
│   ├── models/
│   │   └── log.model.js (NEW)
│   └── routes/
│       └── auth.routes.js (NEW)

agentic-rag-frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx (NEW)
│   │   ├── SubHeader.jsx (NEW)
│   │   ├── SubSubHeader.jsx (NEW)
│   │   └── ProtectedRoute.jsx (NEW)
│   ├── contexts/
│   │   └── AuthContext.jsx (NEW)
│   ├── pages/
│   │   ├── Home.jsx (NEW)
│   │   ├── Login.jsx (NEW)
│   │   ├── AboutUs.jsx (NEW)
│   │   ├── ContactUs.jsx (NEW)
│   │   └── AdminDashboard.jsx (UPDATED)
│   ├── App.jsx (UPDATED)
│   └── main.jsx (UPDATED)
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify .env file has all required variables
- Check port 3000 is not in use

### Frontend won't start
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check port 5173 is not in use

### Google OAuth not working
- Verify Client ID matches in both backend .env and frontend .env
- Check authorized origins in Google Cloud Console
- Make sure you're using the correct Google account

### Admin Dashboard not visible
- Verify you're logged in with `shantanuvhanmore@gmail.com`
- Check backend .env has `ADMIN_EMAILS=shantanuvhanmore@gmail.com`
- Clear browser cache and re-login

---

## 📞 Support

For issues, contact the development team:
- **Shantanu Vhanmore**: shantanuvhanmore@gmail.com
- **Pooja**: pooja@nmiet.edu
- **Yasir**: yasir@nmiet.edu

---

## 🚀 Next Steps

1. Add actual college logos to `/public` folder
2. Populate database with real college data
3. Configure production environment variables
4. Deploy to cloud (Vercel, Railway, etc.)
5. Set up monitoring and analytics

---

**Built with ❤️ by NMIET FYP Team**
