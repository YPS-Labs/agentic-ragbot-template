import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
    const { login, loginAsGuest } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        const result = await login(credentialResponse.credential);
        setLoading(false);

        if (result.success) {
            navigate('/');
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
            navigate('/');
        } else {
            setError(result.error || 'Guest login failed');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h1>Welcome to NMIET RAG Chatbot</h1>
                    <p>Sign in to access the intelligent assistant</p>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="login-options">
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

                    <div className="divider">
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

                <div className="login-footer">
                    <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
                </div>
            </div>
        </div>
    );
}
