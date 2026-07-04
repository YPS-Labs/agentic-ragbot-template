import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaShieldAlt, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './MainSubHeader.css';

export default function MainSubHeader({ onShowLoginModal }) {
    const [showExplore, setShowExplore] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const { isAuthenticated, user, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const profileMenuRef = useRef(null);

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

    const exploreCategories = {
        'Scholarship': ['Eligibility', 'Documents', 'Application', 'Tracking status', 'Technical issues'],
        'FEE': ['Pay Fees', 'Loans', 'Refunds', 'Installment', 'Accounts'],
        'ERP Portal': ['Fees structure', 'Attendance', 'Payment', 'Print Receipt', 'Change Credentials'],
        'Library': ['Jobs', 'Rules & Timings', 'Borrowing & Fines', 'OPAC search', 'Knimbus/J-Gate/DELNET'],
        'Examination': ['Exam Forms', 'Passing Criteria', 'Revaluation', 'ATKT/year-down', 'Carry Forward'],
        'Admission': ['Eligibility', 'Admission requirements (documents FE/DSE)', 'Contact inquiry'],
        'Documents': ['Bonafide', 'Bus/Rail concessions', 'Leaving Certificate', 'Document verification'],
        'Contacts': ['Administrative staff', 'Office hours & services', 'Contact information', 'Responsibilities']
    };




    return (
        <div className="main-subheader">
            <div className="subheader-container">
                <div className="nav-left">
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/about" className="nav-link">About Us</Link>
                    <Link to="/contact" className="nav-link">Contact Us</Link>
                </div>

                <div className="nav-center">
                    <button
                        className="explore-button"
                        onMouseEnter={() => setShowExplore(true)}
                        onMouseLeave={() => setShowExplore(false)}
                    >
                        Explore
                    </button>

                    {showExplore && (
                        <div
                            className="explore-dropdown"
                            onMouseEnter={() => setShowExplore(true)}
                            onMouseLeave={() => setShowExplore(false)}
                        >
                            <div className="explore-grid">
                                {Object.entries(exploreCategories).map(([category, items]) => (
                                    <div key={category} className="explore-column">
                                        <h4 className="category-heading">{category}</h4>
                                        <ul className="category-items">
                                            {items.map((item, index) => (
                                                <li key={index}>
                                                    <button className="item-link">
                                                        {item}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="nav-right">
                    {!isAuthenticated ? (
                        <button className="auth-button" onClick={() => onShowLoginModal?.()}>
                            Sign Up / Login
                        </button>
                    ) : (
                        <div className="subheader-profile-container" ref={profileMenuRef}>
                            <button
                                className="auth-button"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                Profile
                            </button>

                            {showProfileMenu && (
                                <div className="subheader-profile-dropdown">
                                    <div className="subheader-profile-header">
                                        <div className="user-avatar small">
                                            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
                                        </div>
                                        <div className="subheader-user-info">
                                            <div className="subheader-user-name">{user?.name || 'User'}</div>
                                            <div className="subheader-user-email">{user?.email}</div>
                                        </div>
                                    </div>
                                    <div className="subheader-profile-divider"></div>

                                    {isAdmin && (
                                        <button
                                            className="subheader-profile-item"
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
                                        className="subheader-profile-item"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate('/profile');
                                        }}
                                    >
                                        <span className="menu-item-icon"><FaCog /></span>
                                        <span>Settings</span>
                                    </button>
                                    <div className="subheader-profile-divider"></div>
                                    <button
                                        className="subheader-profile-item logout-item"
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
                    )}
                </div>
            </div>
        </div>
    );
}
