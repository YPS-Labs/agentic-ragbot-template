import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import './LoginModal.css';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
    const { login, loginAsGuest } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        const result = await login(credentialResponse.credential);
        setLoading(false);

        if (result.success) {
            onLoginSuccess?.();
        } else {
            setError(result.error || 'Login failed');
        }
    };

    const handleGoogleError = () => {
        setError('Google login failed. Please try again.');
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError('');
        const result = await loginAsGuest();
        setLoading(false);

        if (result.success) {
            onLoginSuccess?.();
        } else {
            setError(result.error || 'Guest login failed');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">
                    ✕
                </button>

                <div className="modal-header">
                    <h2>Welcome to NMIET RAG Chatbot</h2>
                    <p>Sign in to access the intelligent assistant</p>
                </div>

                {error && (
                    <div className="modal-error">
                        {error}
                    </div>
                )}

                <div className="modal-body">
                    <div className="google-login-wrapper">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            theme="filled_blue"
                            size="large"
                            text="signin_with"
                            shape="rectangular"
                        />
                    </div>

                    <div className="modal-divider">
                        <span>OR</span>
                    </div>

                    <button
                        className="guest-login-btn"
                        onClick={handleGuestLogin}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Continue as Guest'}
                    </button>
                </div>

                <div className="modal-footer">
                    <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
                </div>
            </div>
        </div>
    );
}
