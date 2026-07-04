import React from 'react';
import './Header.css';
import headerBanner from '../assets/header_banner.jpg';

export default function Header({ onToggleSidebar }) {
    return (
        <div className="main-header">
            <div className="header-content">
                <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <img
                    src={headerBanner}
                    alt="NMIET Banner"
                    className="header-banner-img"
                />
            </div>
        </div>
    );
}
