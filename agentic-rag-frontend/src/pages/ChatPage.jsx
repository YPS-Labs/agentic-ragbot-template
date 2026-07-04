import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChatNav from '../components/ChatNav';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import { FaArrowUp, FaArrowDown, FaRobot } from 'react-icons/fa';
import './ChatPage.css';

export default function ChatPage() {
    const { token, API_BASE } = useAuth();
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [typingText, setTypingText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [sidebarKey, setSidebarKey] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Token tracking states
    const [tokensUsed, setTokensUsed] = useState(0);
    const [totalTokens, setTotalTokens] = useState(null);
    const [isSessionExhausted, setIsSessionExhausted] = useState(false);

    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSelectConversation = async (conversationId) => {
        setCurrentConversationId(conversationId);
        await loadConversationMessages(conversationId);
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages, typingText]);

    // useEffect(() => {
    //     console.log("Messages changed:", messages);
    // }, [messages]);

    // useEffect(() => {
    //     console.log("Typing changed:", typingText);
    // }, [typingText]);

    // Handle scroll button visibility
    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [messages]);

    // Load messages when conversation is selected
    // useEffect(() => {
    //     if (currentConversationId) {
    //         loadConversationMessages(currentConversationId);
    //     } else {
    //         setMessages([]);
    //     }
    // }, [currentConversationId]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [query]);

    const loadConversationMessages = async (conversationId) => {
        console.log("Loading conversation messages...");
        try {
            const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const response = await res.json();
                const messagesData = response.data || [];
                const formattedMessages = messagesData.map(msg => ({
                    id: msg._id,
                    type: msg.sender === 'user' ? 'user' : 'bot',
                    text: msg.content,
                    feedback: msg.feedback
                }));
                setMessages(formattedMessages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const currentQuery = query.trim();
        if (!currentQuery || loading || isSessionExhausted) return;

        // Reset height
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        const userMessage = { type: 'user', text: currentQuery };
        setMessages(prev => [...prev, userMessage]);
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
                    query: currentQuery,
                    conversationId: currentConversationId
                })
            });

            if (res.ok) {
                const data = await res.json();
                const answer = data.answer || data.data?.answer || 'No response';

                // console.log('[Token Tracking] Response data:', {
                //     tokens_used: data.tokens_used,
                //     total_tokens: data.total_tokens,
                //     session_exhausted: data.session_exhausted
                // });

                // Update token tracking
                if (data.tokens_used !== undefined) {
                    console.log('[Token Tracking] Setting tokensUsed to:', data.tokens_used);
                    setTokensUsed(data.tokens_used);
                }
                if (data.total_tokens !== undefined) {
                    console.log('[Token Tracking] Setting totalTokens to:', data.total_tokens);
                    setTotalTokens(data.total_tokens);
                }
                if (data.session_exhausted !== undefined) {
                    setIsSessionExhausted(data.session_exhausted);
                }

                if (data.conversationId && !currentConversationId) {
                    setCurrentConversationId(data.conversationId);
                    setSidebarKey(prev => prev + 1);
                }

                typeBotResponse(answer, data.messageId);
            } else if (res.status === 429) {
                // Rate limit exceeded
                const errorData = await res.json();
                setIsSessionExhausted(true);
                setMessages(prev => [...prev, {
                    type: 'bot',
                    text: errorData.message || 'Rate limit exceeded. Please try again later.'
                }]);
            } else {
                setMessages(prev => [...prev, {
                    type: 'bot',
                    text: 'Sorry, an error occurred. Please try again.'
                }]);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                type: 'bot',
                text: 'Connection error. Please check your connection and try again.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const typeBotResponse = (text, messageId) => {
        console.log("typeBotResponse called");
        let index = 0;
        setTypingText('');

        const typing = setInterval(() => {
            if (index < text.length) {
                setTypingText(prev => prev + text[index]);
                index++;
            } else {
                clearInterval(typing);
                setTypingText('');
                setMessages(prev => {
                    if (prev.some(msg => msg.id === messageId)) {
                        return prev;
                    }
                    return [...prev, {
                        id: messageId,
                        type: 'bot',
                        text: text,
                        feedback: null
                    }];
                });
                // setTypingText('');
            }
        }, 8); // Slightly faster typing speed
    };

    const handleFeedbackChange = async (messageId, feedback) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, feedback } : msg
        ));

        try {
            await fetch(`${API_BASE}/api/conversations/messages/${messageId}/feedback`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ feedback })
            });
        } catch (error) {
            console.error('Error updating feedback:', error);
        }
    };

    const handleNewChat = () => {
        setCurrentConversationId(null);
        setMessages([]);
        setQuery('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.focus();
        }
    };

    const suggestionPills = [
        "📚 Available Programs",
        "💰 Scholarship Info",
        "📝 Admission Process",
        "🏫 Campus Facilities"
    ];
    // console.log(" 🚨new Messages:", messages);
    // console.log("🚨Typing:", typingText);

    return (
        <div className="chat-page">
            <ChatNav />

            <div className="chat-layout">
                <Sidebar
                    key={sidebarKey}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    currentConversationId={currentConversationId}
                    onSelectConversation={handleSelectConversation}
                    onNewChat={handleNewChat}
                />

                <div className={`chat-main ${messages.length === 0 ? 'empty-chat' : ''}`}>
                    {messages.length === 0 && !typingText ? (
                        <div className="chat-welcome">
                            <div className="welcome-icon">
                                <FaRobot />
                            </div>
                            <h1 className="welcome-title">How can I help you today?</h1>
                            <p className="welcome-subtitle">
                                Ask me anything about College - admissions, courses, scholarships, and more!
                            </p>

                            {/* Suggestion pills removed */}
                        </div>
                    ) : (
                        <>
                            <div className="chat-messages-container" ref={messagesContainerRef}>
                                {messages.map((msg, index) => (
                                    <MessageBubble
                                        key={index}
                                        id={msg.id}
                                        type={msg.type}
                                        text={msg.text}
                                        feedback={msg.feedback}
                                        onFeedbackChange={handleFeedbackChange}
                                        isTyping={false}
                                    />
                                ))}
                                {typingText && (
                                    <MessageBubble
                                        type="bot"
                                        text={typingText}
                                        isTyping={true}
                                    />
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {showScrollButton && (
                                <button className="scroll-to-bottom-btn" onClick={scrollToBottom}>
                                    <FaArrowDown />
                                </button>
                            )}
                        </>
                    )}

                    <div className="chat-input-wrapper">
                        {/* Compact Token Usage Indicator - Above Input */}
                        {totalTokens && (
                            <div className="token-usage-compact">
                                <svg className="zap-icon-small" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                <div className="token-bar-mini">
                                    <div
                                        className={`token-fill-mini ${(tokensUsed / totalTokens) > 0.9 ? 'near-limit' : ''}`}
                                        style={{ width: `${Math.min((tokensUsed / totalTokens) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="chat-input-form">
                            <div className="input-container">
                                <textarea
                                    ref={textareaRef}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isSessionExhausted ? "Daily limit reached..." : "Ask anything about College..."}
                                    className="chat-input"
                                    disabled={loading || isSessionExhausted}
                                    rows={1}
                                />
                            </div>

                            {query.length > 0 && (
                                <span className="char-count">tokens</span>
                            )}

                            <button
                                type="submit"
                                className={`send-button ${query.trim() ? 'active' : ''}`}
                                disabled={loading || !query.trim() || isSessionExhausted}
                            >
                                {loading ? (
                                    <div className="loading-spinner"></div>
                                ) : (
                                    <FaArrowUp className="send-icon" style={{ fontSize: '16px', color: 'white' }} />
                                )}
                            </button>
                        </form>

                        {messages.length === 0 && (
                            <p className="input-hint">
                                Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for new line
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
