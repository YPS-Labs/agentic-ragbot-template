import React from 'react';
import { Link } from 'react-router-dom';
import { FaRobot, FaHome, FaInfoCircle, FaEnvelope } from 'react-icons/fa';
import './ChatNav.css';

export default function ChatNav() {
    return (
        <div className="chat-nav">
            <div className="chat-nav-container">
                <div className="chat-nav-links">
                    <Link to="/" className="nav-link-minimal">Home</Link>
                    <Link to="/about" className="nav-link-minimal">About Us</Link>
                    <Link to="/contact" className="nav-link-minimal">Contact Us</Link>
                </div>

                <div className="chat-nav-brand">
                    <span className="nav-logo"><FaRobot /></span>
                    <span className="nav-title">NMIET AI Assistant</span>
                </div>

                {/* Spacer to balance the layout for absolute centering */}
                <div className="nav-spacer" style={{ width: '200px' }}></div>
            </div>
        </div>
    );
}
