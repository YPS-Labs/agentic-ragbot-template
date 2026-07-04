import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FaPlus, FaSearch, FaFolder, FaShieldAlt, FaCog, FaSignOutAlt,
  FaChevronLeft, FaChevronRight, FaRegCommentDots, FaTrashAlt
} from 'react-icons/fa';
import './sidebar.css';

export default function Sidebar({ isOpen = true, onToggle, currentConversationId, onSelectConversation, onNewChat }) {
  const { token, API_BASE, user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, [token]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const response = await res.json();
        setConversations(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setConversations(prev => prev.filter(c => c._id !== id));
        if (currentConversationId === id) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      {/* Toggle Button */}
      <button className="sidebar-toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
        {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
      </button>

      {isOpen ? (
        /* Expanded Sidebar */
        <>
          <div className="sidebar-header">
            <button className="new-chat-btn" onClick={onNewChat}>
              <span className="icon"><FaPlus /></span>
              <span>New chat</span>
            </button>
          </div>

          <div className="sidebar-search">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="sidebar-menu">
            <button className="menu-item-btn">
              <span className="menu-icon"><FaFolder /></span>
              <span>Docs (Beta)</span>
            </button>
          </div>

          <div className="sidebar-conversations">
            <h3 className="conversations-title">Your chats</h3>
            <div className="conversations-list">
              {filteredConversations.length === 0 ? (
                <p className="no-chats">No conversations yet</p>
              ) : (
                filteredConversations.map(conv => (
                  <div className="conversation-item-wrapper" key={conv._id}>
                    <div
                      className={`conversation-item ${currentConversationId === conv._id ? 'active' : ''}`}
                      onClick={() => onSelectConversation(conv._id)}
                    >
                      <div className="conversation-content">
                        <span className="conversation-title">{conv.title || 'New conversation'}</span>
                        <span className="conversation-meta">{formatDate(conv.updatedAt)}</span>
                      </div>
                      <button
                        className="conversation-action-btn"
                        onClick={(e) => handleDelete(conv._id, e)}
                        aria-label="Delete"
                        title="Delete chat"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Profile at Bottom */}
          <div className="sidebar-footer" ref={profileMenuRef}>
            <button
              className="user-profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="user-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || user?.email || 'Guest User'}</span>
              </div>
              <span className="profile-menu-icon" style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                {showProfileMenu ? '▲' : '▼'}
              </span>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown-menu">
                {isAdmin && (
                  <button
                    className="profile-menu-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/admin');
                    }}
                  >
                    <span className="menu-item-icon"><FaShieldAlt /></span>
                    <span>Admin Dashboard</span>
                  </button>
                )}
                <button
                  className="profile-menu-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                >
                  <span className="menu-item-icon"><FaCog /></span>
                  <span>Settings</span>
                </button>
                <div className="profile-menu-divider"></div>
                <button
                  className="profile-menu-item logout-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                >
                  <span className="menu-item-icon"><FaSignOutAlt /></span>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Collapsed Sidebar */
        <div className="sidebar-collapsed-content">
          <button className="collapsed-btn" onClick={onNewChat} title="New chat">
            <FaPlus />
          </button>
          <button className="collapsed-btn" title="Search">
            <FaSearch />
          </button>

          <div className="collapsed-divider"></div>

          <button className="collapsed-btn" title="Docs">
            <FaFolder />
          </button>

          {isAdmin && (
            <button className="collapsed-btn" onClick={() => navigate('/admin')} title="Admin Dashboard">
              <FaShieldAlt />
            </button>
          )}

          <div className="collapsed-spacer" style={{ flex: 1 }}></div>

          <button className="collapsed-btn user-avatar-btn" onClick={() => setShowProfileMenu(!showProfileMenu)} title="Profile">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>
        </div>
      )}
    </div>
  );
}
