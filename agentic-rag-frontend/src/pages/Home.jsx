import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MessageBubble from '../components/MessageBubble';
import Footer from '../components/Footer';
import './Home.css';

export default function Home({ conversationId, setConversationId, onShowLoginModal }) {
    const { token, API_BASE, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [typingText, setTypingText] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [placeholder, setPlaceholder] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const chatEndRef = useRef(null);

    const placeholders = [
        'How to Apply for Bonafide, Leaving Certificate',
        'Where to Pay Fees in Installment',
        'Process to Renew Scholarship Application',
        'Find Emergency contacts and support'
    ];

    // Typing placeholder effect
    useEffect(() => {
        const currentText = placeholders[placeholderIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (placeholder.length < currentText.length) {
                    setPlaceholder(currentText.slice(0, placeholder.length + 1));
                } else {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                if (placeholder.length > 0) {
                    setPlaceholder(currentText.slice(0, placeholder.length - 1));
                } else {
                    setIsDeleting(false);
                    setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
                }
            }
        }, isDeleting ? 50 : 100);

        return () => clearTimeout(timeout);
    }, [placeholder, isDeleting, placeholderIndex]);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingText, loading]);

    // Load messages when conversationId changes
    useEffect(() => {
        if (conversationId) {
            fetchMessages(conversationId);
        } else {
            setMessages([]);
        }
    }, [conversationId]);

    const fetchMessages = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/conversations/${id}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const formattedMessages = data.data.map(m => ({
                    id: m._id,
                    sender: m.sender,
                    text: m.content,
                    feedback: m.feedback
                }));
                setMessages(formattedMessages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
        setLoading(false);
    };

    const typeBotResponse = (id, fullText) => {
        let idx = 0;
        setTypingText(' ');

        const interval = setInterval(() => {
            setTypingText(fullText.substring(0, idx + 1));
            idx++;

            if (idx === fullText.length) {
                clearInterval(interval);
                setMessages(prev => [...prev, { id, sender: 'bot', text: fullText, feedback: 'none' }]);
                setTypingText('');
            }
        }, 15);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim() || loading) return;

        const userQuery = query;
        setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
        setQuery('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: userQuery,
                    conversationId: conversationId
                })
            });

            const data = await res.json();
            if (data.success) {
                if (!conversationId) {
                    setConversationId(data.conversationId);
                }
                typeBotResponse(data.messageId, data.data.answer);
            } else {
                setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I failed to get an answer.' }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { sender: 'bot', text: 'Error connecting to the server.' }]);
        }

        setLoading(false);
    };

    const handleFeedbackChange = async (messageId, newFeedback) => {
        if (!messageId) return;

        // Optimistic update
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, feedback: newFeedback } : m
        ));

        try {
            await fetch(`${API_BASE}/api/conversations/messages/${messageId}/feedback`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ feedback: newFeedback })
            });
        } catch (error) {
            console.error('Error updating feedback:', error);
        }
    };

    const handleChatNow = () => {
        if (!isAuthenticated) {
            onShowLoginModal?.();
        } else {
            navigate('/chat');
        }
    };

    return (
        <div className="home-wrapper">
            <div className="home-content">
                {messages.length === 0 && !loading && !typingText ? (
                    <div className="welcome-section">
                        <h1 className="welcome-title">Hey, Wondering about the Campus?</h1>
                        <h2 className="help-title">Need help with something?</h2>
                        <div className="search-form">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        onShowLoginModal?.();
                                    } else {
                                        navigate('/chat');
                                    }
                                }}
                                placeholder={placeholder + '|'}
                                className="search-input"
                            />
                        </div>
                        <div className="help-section">
                            <div className="quick-questions">
                                <button className="quick-question-btn chat-now-btn" onClick={handleChatNow}>Chat Now</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="chat-section">
                        <div className="chat-messages">
                            {messages.map((m, i) => (
                                <MessageBubble
                                    key={m.id || i}
                                    {...m}
                                    onFeedbackChange={handleFeedbackChange}
                                />
                            ))}

                            {typingText && (
                                <div className="message-wrapper bot-wrapper">
                                    <div className="msgBot">
                                        {typingText}
                                        <span className="cursor">▌</span>
                                    </div>
                                </div>
                            )}

                            {loading && !typingText && (
                                <div className="message-wrapper bot-wrapper">
                                    <div className="msgBot thinking">Thinking...</div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSearch} className="chat-input-form">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask a follow-up question..."
                                className="chat-input"
                            />
                            <button type="submit" className="send-button" disabled={loading}>
                                Send
                            </button>
                        </form>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
