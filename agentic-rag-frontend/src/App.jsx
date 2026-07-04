import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import MainSubHeader from './components/MainSubHeader';
import Sidebar from './components/Sidebar';
import LoginModal from './components/LoginModal';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [currentConversationId, setCurrentConversationId] = React.useState(null);
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleNewChat = () => setCurrentConversationId(null);
  const handleSelectConversation = (id) => setCurrentConversationId(id);
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // Only navigate to home if NOT on contact page (to preserve form data)
    if (location.pathname !== '/contact') {
      navigate('/');
    }
  };

  return (
    <div className={`app ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Show main headers only on non-chat pages */}
      {!location.pathname.startsWith('/chat') && (
        <>
          <Header onToggleSidebar={toggleSidebar} />
          <MainSubHeader onShowLoginModal={() => setShowLoginModal(true)} />
        </>
      )}

      <div className="main-layout">
        <div className="content-area">
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" replace /> : <Login />
            } />

            <Route path="/" element={
              <Home
                conversationId={currentConversationId}
                setConversationId={setCurrentConversationId}
                onShowLoginModal={() => setShowLoginModal(true)}
              />
            } />

            <Route path="/chat" element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } />

            <Route path="/about" element={<AboutUs />} />

            <Route path="/contact" element={
              <ContactUs onShowLoginModal={() => setShowLoginModal(true)} />
            } />

            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
