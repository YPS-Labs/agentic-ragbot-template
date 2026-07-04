import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const { token, API_BASE, user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('logs');
    const [logs, setLogs] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [userStats, setUserStats] = useState(null);
    const [rateLimitSettings, setRateLimitSettings] = useState({
        enabled: true,
        type: 'requests',
        requestLimit: 10,
        tokenLimit: 2000
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Log filters
    const [filters, setFilters] = useState({
        feedbackType: 'all',
        timeRange: '24h',
        page: 1,
        limit: 20
    });

    // Pagination
    const [logPagination, setLogPagination] = useState(null);
    const [convPagination, setConvPagination] = useState(null);
    const [convPage, setConvPage] = useState(1);

    // Reports Pagination
    const [reports, setReports] = useState([]);
    const [reportsPagination, setReportsPagination] = useState(null);
    const [reportsPage, setReportsPage] = useState(1);

    useEffect(() => {
        // Redirect non-admin users
        if (user && user.role !== 'admin') {
            navigate('/');
            return;
        }

        if (activeTab === 'logs') {
            fetchLogs();
        } else if (activeTab === 'conversations') {
            fetchConversations();
        } else if (activeTab === 'users') {
            fetchUserStats();
        } else if (activeTab === 'limit') {
            fetchRateLimitSettings();
        } else if (activeTab === 'reports') {
            fetchReports();
        }
    }, [activeTab, filters, convPage, reportsPage]);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const res = await fetch(`${API_BASE}/api/admin/logs?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setLogPagination({
                    page: data.page,
                    totalPages: data.totalPages,
                    total: data.total
                });
            } else {
                const err = await res.json();
                setError(err.error?.message || 'Failed to fetch logs');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        }
        setLoading(false);
    };

    const fetchConversations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `${API_BASE}/api/admin/conversations?page=${convPage}&limit=20`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                setConversations(data.data || []);
                setConvPagination(data.pagination);
            } else {
                const err = await res.json();
                setError(err.error?.message || 'Failed to fetch conversations');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        }
        setLoading(false);
    };

    const fetchUserStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setUserStats(data.data);
            } else {
                const err = await res.json();
                setError(err.error?.message || 'Failed to fetch user stats');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        }
        setLoading(false);
    };

    const fetchRateLimitSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/admin/rate-limit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setRateLimitSettings(data.data || {
                    enabled: true,
                    type: 'requests',
                    requestLimit: 10,
                    tokenLimit: 2000
                });
            } else {
                // Handle HTTP errors (403, 404, etc.)
                let errorMessage = 'Failed to fetch settings';
                try {
                    const err = await res.json();
                    errorMessage = err.error?.message || err.message || errorMessage;
                } catch (parseError) {
                    errorMessage = `HTTP ${res.status}: ${res.statusText}`;
                }

                if (res.status === 403) {
                    errorMessage = 'Access denied. Admin privileges required.';
                }

                setError(errorMessage);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `${API_BASE}/api/admin/reports?page=${reportsPage}&limit=20`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                setReports(data.data || []);
                setReportsPagination(data.pagination);
            } else {
                const err = await res.json();
                setError(err.error?.message || 'Failed to fetch reports');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        }
        setLoading(false);
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setError(null);

        // Frontend validation
        if (rateLimitSettings.type === 'requests') {
            if (rateLimitSettings.requestLimit < 1 || rateLimitSettings.requestLimit > 10000) {
                setError('Request limit must be between 1 and 10,000');
                return;
            }
        } else if (rateLimitSettings.type === 'tokens') {
            if (rateLimitSettings.tokenLimit < 100 || rateLimitSettings.tokenLimit > 1000000) {
                setError('Token limit must be between 100 and 1,000,000');
                return;
            }
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/rate-limit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rateLimitSettings)
            });

            if (res.ok) {
                // Show success message (could add specific state for this)
                alert('Settings updated successfully');
            } else {
                // Handle HTTP errors (403, 404, etc.)
                let errorMessage = 'Failed to update settings';
                try {
                    const err = await res.json();
                    errorMessage = err.error?.message || err.message || errorMessage;
                } catch (parseError) {
                    errorMessage = `HTTP ${res.status}: ${res.statusText}`;
                }

                setError(errorMessage);
            }
        } catch (err) {
            console.error('Update error:', err);
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const truncateText = (text, maxLength = 50) => {
        if (!text) return 'N/A';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    const handleLogPageChange = (newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const handleReportsPageChange = (newPage) => {
        setReportsPage(newPage);
    };

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <p>Monitor and analyze chatbot activity</p>
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
                <button
                    className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    📋 Logs
                </button>
                <button
                    className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('conversations')}
                >
                    💬 Conversations
                </button>
                <button
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Users
                </button>
                <button
                    className={`tab-btn ${activeTab === 'limit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('limit')}
                >
                    ⚙️ Limit
                </button>
                <button
                    className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    🚩 Reports
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {loading ? (
                <div className="loading-state">Loading...</div>
            ) : (
                <div className="admin-content">
                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <>
                            <div className="filters-section">
                                <div className="filter-group">
                                    <label>Time Range:</label>
                                    <select
                                        value={filters.timeRange}
                                        onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="1h">Last 1 Hour</option>
                                        <option value="24h">Last 24 Hours</option>
                                        <option value="7d">Last 7 Days</option>
                                        <option value="all">All Time</option>
                                    </select>
                                </div>

                                <div className="filter-group">
                                    <label>Feedback:</label>
                                    <select
                                        value={filters.feedbackType}
                                        onChange={(e) => handleFilterChange('feedbackType', e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="all">All</option>
                                        <option value="liked">Liked 👍</option>
                                        <option value="disliked">Disliked 👎</option>
                                        <option value="none">No Feedback</option>
                                    </select>
                                </div>

                                <button onClick={fetchLogs} className="refresh-btn">
                                    🔄 Refresh
                                </button>
                            </div>

                            <div className="logs-table-container">
                                <table className="logs-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Conversation</th>
                                            <th>Date/Time</th>
                                            <th>Feedback</th>
                                            <th>Input</th>
                                            <th>Output</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="no-data">No logs found</td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log._id}>
                                                    <td>{log.user_id?.email || log.user_id?.profile?.name || 'Anonymous'}</td>
                                                    <td className="mono" title={log.conversation_id?._id || log.conversation_id}>
                                                        {truncateText(log.conversation_id?.title || log.conversation_id?._id || log.conversation_id || 'N/A', 20)}
                                                    </td>
                                                    <td>{formatDate(log.createdAt || log.timestamp)}</td>
                                                    <td>
                                                        <span className={`feedback-badge ${log.feedback}`}>
                                                            {log.feedback === 'liked' ? '👍' : log.feedback === 'disliked' ? '👎' : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="text-cell">{truncateText(log.input)}</td>
                                                    <td className="text-cell">{truncateText(log.output)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {logPagination && logPagination.totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => handleLogPageChange(logPagination.page - 1)}
                                        disabled={logPagination.page === 1}
                                        className="pagination-btn"
                                    >
                                        Previous
                                    </button>
                                    <span className="pagination-info">
                                        Page {logPagination.page} of {logPagination.totalPages} ({logPagination.total} total)
                                    </span>
                                    <button
                                        onClick={() => handleLogPageChange(logPagination.page + 1)}
                                        disabled={logPagination.page === logPagination.totalPages}
                                        className="pagination-btn"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* CONVERSATIONS TAB */}
                    {activeTab === 'conversations' && (
                        <div className="conversations-panel">
                            <h2>All Conversations ({convPagination?.totalCount || 0})</h2>

                            <div className="logs-table-container">
                                <table className="logs-table">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>User</th>
                                            <th>Messages</th>
                                            <th>👍</th>
                                            <th>👎</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {conversations.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="no-data">No conversations found</td>
                                            </tr>
                                        ) : (
                                            conversations.map(conv => (
                                                <tr key={conv._id}>
                                                    <td className="title-cell">{conv.title || 'Untitled'}</td>
                                                    <td>
                                                        <div>{conv.userName || 'Unknown'}</div>
                                                        <small className="text-muted">{conv.userEmail}</small>
                                                    </td>
                                                    <td className="count-cell">{conv.totalMessages}</td>
                                                    <td className="like-cell">{conv.likedCount}</td>
                                                    <td className="dislike-cell">{conv.dislikedCount}</td>
                                                    <td>{formatDate(conv.createdAt)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {convPagination && convPagination.totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => setConvPage(p => p - 1)}
                                        disabled={convPage <= 1}
                                        className="pagination-btn"
                                    >
                                        Previous
                                    </button>
                                    <span className="pagination-info">
                                        Page {convPagination.currentPage} of {convPagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setConvPage(p => p + 1)}
                                        disabled={convPage >= convPagination.totalPages}
                                        className="pagination-btn"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && userStats && (
                        <div className="users-panel">
                            <h2>User Statistics</h2>

                            <div className="stats-grid">
                                <div className="stat-card">
                                    <span className="stat-value">{userStats.stats.totalUsers}</span>
                                    <span className="stat-label">Total Users</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{userStats.stats.activeUsers}</span>
                                    <span className="stat-label">Active Users</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{userStats.stats.recentActiveUsers}</span>
                                    <span className="stat-label">Active (7 days)</span>
                                </div>
                                <div className="stat-card highlight">
                                    <span className="stat-value">{userStats.stats.totalQueries}</span>
                                    <span className="stat-label">Total Queries</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{userStats.stats.todayQueries}</span>
                                    <span className="stat-label">Today's Queries</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{userStats.stats.adminUsers}</span>
                                    <span className="stat-label">Admins</span>
                                </div>
                            </div>

                            <h3>Top Users by Query Count</h3>
                            <div className="logs-table-container">
                                <table className="logs-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Queries</th>
                                            <th>Last Active</th>
                                            <th>Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userStats.topUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="no-data">No users with queries yet</td>
                                            </tr>
                                        ) : (
                                            userStats.topUsers.map((u, idx) => (
                                                <tr key={idx}>
                                                    <td>{u.name}</td>
                                                    <td>{u.email}</td>
                                                    <td>{u.totalQueries}</td>
                                                    <td>{formatDate(u.lastActive)}</td>
                                                    <td>{formatDate(u.joinedAt)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* LIMITS TAB */}
                    {activeTab === 'limit' && (
                        <div className="limit-panel">
                            <h2>Rate Limit Settings</h2>
                            <p className="settings-description">
                                Configure global rate limits for all users. Limits reset 24 hours after the first request in the cycle.
                            </p>

                            <form onSubmit={handleUpdateSettings} className="settings-form">
                                <div className="setting-group">
                                    <label className="setting-label" htmlFor="enable-limit">
                                        Enable Rate Limiting
                                        <input
                                            id="enable-limit"
                                            name="enabled"
                                            type="checkbox"
                                            checked={rateLimitSettings.enabled}
                                            onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, enabled: e.target.checked })}
                                            className="setting-toggle"
                                        />
                                    </label>
                                </div>

                                <div className="setting-group">
                                    <label className="setting-label">Limit Type</label>
                                    <div className="radio-group">
                                        <label htmlFor="limit-requests">
                                            <input
                                                id="limit-requests"
                                                type="radio"
                                                name="limitType"
                                                value="requests"
                                                checked={rateLimitSettings.type === 'requests'}
                                                onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, type: e.target.value })}
                                            />
                                            Number of Requests
                                        </label>
                                        <label htmlFor="limit-tokens">
                                            <input
                                                id="limit-tokens"
                                                type="radio"
                                                name="limitType"
                                                value="tokens"
                                                checked={rateLimitSettings.type === 'tokens'}
                                                onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, type: e.target.value })}
                                            />
                                            Token Usage
                                        </label>
                                    </div>
                                </div>

                                {rateLimitSettings.type === 'requests' && (
                                    <div className="setting-group">
                                        <label className="setting-label" htmlFor="request-limit">
                                            Max Requests per 24 Hours
                                            <input
                                                id="request-limit"
                                                name="requestLimit"
                                                type="number"
                                                value={rateLimitSettings.requestLimit}
                                                onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, requestLimit: parseInt(e.target.value) || 0 })}
                                                className="setting-input"
                                                min="1"
                                                max="10000"
                                                required
                                            />
                                        </label>
                                    </div>
                                )}

                                {rateLimitSettings.type === 'tokens' && (
                                    <div className="setting-group">
                                        <label className="setting-label" htmlFor="token-limit">
                                            Max Tokens per 24 Hours
                                            <input
                                                id="token-limit"
                                                name="tokenLimit"
                                                type="number"
                                                value={rateLimitSettings.tokenLimit}
                                                onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, tokenLimit: parseInt(e.target.value) || 0 })}
                                                className="setting-input"
                                                min="100"
                                                max="1000000"
                                                required
                                            />
                                        </label>
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button
                                        type="submit"
                                        className="save-btn"
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Apply Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* REPORTS TAB */}
                    {activeTab === 'reports' && (
                        <>
                            <div className="table-responsive">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th className="col-date">Date</th>
                                            <th className="col-name">Name</th>
                                            <th className="col-email">Email</th>
                                            <th className="col-message">Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">No reports found</td>
                                            </tr>
                                        ) : (
                                            reports.map((report) => (
                                                <tr key={report._id}>
                                                    <td>{formatDate(report.createdAt)}</td>
                                                    <td>{report.name}</td>
                                                    <td>{report.email}</td>
                                                    <td className="message-cell">{report.message}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {reportsPagination && reportsPagination.totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        disabled={reportsPagination.currentPage === 1}
                                        onClick={() => handleReportsPageChange(reportsPagination.currentPage - 1)}
                                        className="page-btn"
                                    >
                                        &laquo; Prev
                                    </button>
                                    <span className="page-info">
                                        Page {reportsPagination.currentPage} of {reportsPagination.totalPages}
                                    </span>
                                    <button
                                        disabled={reportsPagination.currentPage === reportsPagination.totalPages}
                                        onClick={() => handleReportsPageChange(reportsPagination.currentPage + 1)}
                                        className="page-btn"
                                    >
                                        Next &raquo;
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
