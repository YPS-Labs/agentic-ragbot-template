import React, { useEffect, useRef } from 'react';
import { FaGithub, FaLinkedin, FaEnvelope, FaCode, FaServer, FaDatabase, FaRobot, FaLock, FaChartLine } from 'react-icons/fa';
import './AboutUs.css';

import guidePhoto from '../assets/Renuka Kajale.png';
import shantanuImg from '../assets/Shantanu Vhanmore.png';
import poojaImg from '../assets/Pooja Pote.png';
import yasirImg from '../assets/Yasir Shaikh.jpg';

export default function AboutUs() {
    const observerRef = useRef(null);

    useEffect(() => {
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in-section').forEach((el) => {
            observerRef.current.observe(el);
        });

        return () => observerRef.current.disconnect();
    }, []);

    const developers = [
        {
            name: 'Shantanu Vhanmore',
            role: 'AI Architect',
            email: 'shantanuvhanmore@gmail.com',
            skills: ['Python', 'AI Agents ', 'RAG'],
            github: 'https://github.com/shantanuvhanmore',
            linkedin: 'https://www.linkedin.com/in/shantanuvhanmore/',
            image: shantanuImg,
            avatar: 'S',
            gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
        },
        {
            name: 'Pooja Pote',
            role: 'Frontend & Data Engineer',
            email: 'poojapote18@gmail.com',
            skills: ['React', 'Design Systems', 'CSS3'],
            github: 'https://github.com/pooja-pote18',
            linkedin: 'https://www.linkedin.com/in/pooja-pote-5a4526331/',
            image: poojaImg,
            avatar: 'P',
            gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)'
        },
        {
            name: 'Yasir Shaikh',
            role: 'Backend & Database Engineer',
            email: 'yasirshaikhpune@nmiet.edu',
            skills: ['MongoDB', 'Express', 'API Design'],
            github: 'https://github.com/YasirShaikh786',
            linkedin: 'https://www.linkedin.com/in/yasir-shaikh-1283a5258/',
            image: yasirImg,
            avatar: 'Y',
            gradient: 'linear-gradient(135deg, #10b981, #059669)'
        }
    ];

    // ... (rest of the code)

    return (
        <div className="about-page-redesign">
            {/* HERO SECTION */}
            {/* ... (existing hero section) */}
            <section className="hero-section fade-in-section">
                <div className="hero-content">
                    <h1 className="hero-title">When Bureaucracy Meets <span className="text-gradient">Innovation</span></h1>

                    <div className="hero-passages">
                        <div className="passage-card">
                            <h3 className="passage-label">The Pain</h3>
                            <p>
                                Students lost in administrative mazes. Staff drowning in repetitive queries.
                                Information scattered across departments. We saw frustration becoming routine,
                                and chose to disrupt it.
                            </p>
                        </div>
                        <div className="passage-card highlight">
                            <h3 className="passage-label">The Audacity</h3>
                            <p>
                                Armed with AI and determination, we built what institutions need: intelligent
                                assistance that understands context, scales infinitely and never sleeps transforming
                                campus experience fundamentally.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="content-container">
                {/* GRATITUDE SECTION */}
                <section className="gratitude-section fade-in-section">
                    <div className="gratitude-card">
                        <h2 className="section-title">Guided by Excellence</h2>
                        <div className="gratitude-layout">
                            <div className="guide-photo-wrapper">
                                <img src={guidePhoto} alt="Dr. Renuka Kajale" className="guide-photo" />
                            </div>
                            <div className="quote-content">
                                <p>
                                    This journey wouldn't exist without <strong>Dr. Renuka Kajale</strong>, whose unwavering support and our international conference presentation at
                                    <strong> ICITSE 2025</strong> proved that great teachers don't just TEACH, they BELIEVE.
                                    Dr. Renuka Kajale saw potential where we saw complexity and taught us that solving real problems
                                    requires both technical skill and courage.
                                </p>
                                <div className="quote-accent"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURE SHOWCASE */}
                <section className="features-section fade-in-section">
                    <h2 className="section-title center">Intelligence in Action</h2>
                    <div className="features-grid-enhanced">
                        <div className="feature-card-enhanced">
                            <div className="feature-icon-wrapper"><FaRobot /></div>
                            <h4>AI-Powered Responses</h4>
                            <p>Leverages advanced language models for accurate, context-aware answers that feel human.</p>
                        </div>
                        <div className="feature-card-enhanced">
                            <div className="feature-icon-wrapper"><FaDatabase /></div>
                            <h4>Multi-Section RAG</h4>
                            <p>Retrieves grounded information from multiple college document sections instantly.</p>
                        </div>
                        <div className="feature-card-enhanced">
                            <div className="feature-icon-wrapper"><FaLock /></div>
                            <h4>Secure Authentication</h4>
                            <p>Enterprise-grade Google OAuth integration with strict role-based access control.</p>
                        </div>
                        <div className="feature-card-enhanced">
                            <div className="feature-icon-wrapper"><FaChartLine /></div>
                            <h4>Web Integration</h4>
                            <p>Real-time updates from authorized platforms regarding Scholarships and Exams.</p>
                        </div>
                    </div>
                </section>


                {/* THE OPPORTUNITY / TEAM */}
                <section className="team-section fade-in-section">
                    <div className="team-header">
                        <h2 className="section-title center">The Team Behind the Innovation</h2>
                        <p className="section-subtitle">We don't just write code. We solve problems that matter.</p>
                    </div>

                    <div className="developers-grid-enhanced">
                        {developers.map((dev, index) => (
                            <div key={index} className="developer-card-enhanced">
                                <div className="dev-header" style={{ background: dev.gradient }}>
                                    <div className="dev-avatar">
                                        {dev.image ? (
                                            <img src={dev.image} alt={dev.name} className="dev-profile-img" />
                                        ) : (
                                            dev.avatar
                                        )}
                                    </div>
                                </div>
                                <div className="dev-body">
                                    <h3 className="dev-name">{dev.name}</h3>
                                    <p className="dev-role">{dev.role}</p>

                                    <div className="dev-skills">
                                        {dev.skills.map((skill, i) => (
                                            <span key={i} className="skill-tag">{skill}</span>
                                        ))}
                                    </div>

                                    <div className="dev-actions">
                                        <a href={`mailto:${dev.email}`} className="action-btn primary">
                                            <FaEnvelope /> Contact
                                        </a>
                                        <a href={dev.github} className="action-btn secondary" title="GitHub">
                                            <FaGithub />
                                        </a>
                                        <a href={dev.linkedin} className="action-btn secondary" title="LinkedIn">
                                            <FaLinkedin />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* NMIET CONTEXT */}
                <section className="nmiet-context-section fade-in-section">
                    <div className="context-card">
                        <h3>About NMIET</h3>
                        <p>
                            <strong>NMIET</strong> (Nutan Maharashtra Institute of Engineering and Technology) is an
                            autonomous institution under PCET, affiliated with Savitribai Phule Pune University, and
                            accredited by NBA and NAAC. We're proud to represent an institution that encourages
                            innovation and real-world problem-solving.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
