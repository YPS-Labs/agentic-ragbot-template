import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ContactUs.css';

export default function ContactUs({ onShowLoginModal }) {
    const { API_BASE, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if user is logged in
        if (!isAuthenticated) {
            onShowLoginModal();
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const res = await fetch(`${API_BASE}/api/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setStatus({ type: 'success', message: 'Report submitted successfully!' });
                setFormData({ name: '', email: '', message: '' });
            } else {
                setStatus({ type: 'error', message: data.message || 'Failed to submit report' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact-page">
            <div className="contact-container">
                <header className="contact-header">
                    <h1>Contact Us</h1>
                    <p>We'd love to hear from you. Reach out to our development team.</p>
                </header>

                {/* Split Section: Developers & Report Form */}
                <section className="split-section">
                    {/* Left: Developers Contact */}
                    <div className="split-column developers-column">
                        <h2 className="section-title">Developers Contact</h2>
                        <div className="dev-contact-list">
                            <div className="dev-contact-item">
                                <div className="dev-label">Emails</div>
                                <div className="dev-value">
                                    shantanuvhanmore@gmail.com<br />
                                    poojapote18@gmail.com<br />
                                    yasirshaikhpune@gmail.com
                                </div>
                            </div>
                            <div className="dev-contact-item">
                                <div className="dev-label">Contact Number</div>
                                <div className="dev-value">+91 9172270184, +91 8208575910, +91 8080414967</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Bug Report Form */}
                    <div className="split-column form-column">
                        <h2 className="section-title">Report Bugs / Feedback</h2>
                        <form onSubmit={handleSubmit} className="report-form">
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Your Name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="your.email@example.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="message">Message</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    placeholder="Describe the bug or feature request..."
                                    rows="3"
                                    required
                                />
                            </div>

                            {status.message && (
                                <div className={`form-status ${status.type}`}>
                                    {status.message}
                                </div>
                            )}

                            <button type="submit" className="submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Sending...' : 'Submit Report'}
                            </button>
                        </form>
                    </div>
                </section>

                {/* College Contact Section */}
                <section className="nmiet-section">
                    <div className="nmiet-header">
                        <h2 className="section-title">College Contact Information</h2>
                        {/* <h3>Nutan Maharashtra Vidya Prasarak Mandal's.</h3>
                        <p className="nmiet-address">“Samarth Vidya Sankul”, Vishnupuri, Talegaon Dabhade, Pune – 410507</p>
                    </div>

                    <div className="nmiet-details-grid">
                        <div className="detail-column">
                            <h4>📞 Phone</h4>
                            <ul className="detail-list">
                                <li>02114-231666</li>
                                <li><strong>Dr. Shekhar Rahane:</strong> +91 92702 52277</li>
                                <li><strong>Prof. Ugale Shankarro D:</strong> +91 95032 53340</li>
                                <li><strong>Graphics & Multimedia B.VOC Enquiry:</strong> +91 77559 00813</li>
                            </ul>
                        </div>
                        <div className="detail-column">
                            <h4>✉️ Mail</h4>
                            <ul className="detail-list">
                                <li><strong>OFFICE:</strong> nmiettalegaon@gmail.com</li>
                                <li><strong>ADMISSION:</strong> admission.enquiry@nmiet.edu.in</li>
                            </ul> */}
                        {/* </div> */}
                    </div>
                </section>
            </div>
        </div>
    );
}
