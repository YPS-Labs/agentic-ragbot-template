import React from 'react';
import './Footer.css';

export default function Footer() {
    const developers = [
        {
            name: 'Shantanu Vhanmore',
            email: 'shantanuvhanmore@gmail.com',
            linkedin: '#',
            github: '#'
        },
        {
            name: 'Pooja Pote',
            email: 'poojapote2003@nmiet.edu',
            linkedin: '#',
            github: '#'
        },
        {
            name: 'Yasir Shaikh',
            email: 'yasirshaikhpune@nmiet.edu',
            linkedin: '#',
            github: '#'
        }
    ];

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-column">
                    <h4 className="footer-heading">Developers</h4>
                    {developers.map((dev, index) => (
                        <div key={index} className="footer-item">
                            <p className="dev-names">{dev.name}</p>
                            <p className="dev-contact">
                                {dev.email} •
                                <a href={dev.linkedin} target="_blank" rel="noopener noreferrer"> LinkedIn</a> •
                                <a href={dev.github} target="_blank" rel="noopener noreferrer"> GitHub</a>
                            </p>
                        </div>
                    ))}
                </div>

                <div className="footer-column">
                    <h4 className="footer-heading">Institute</h4>
                    <div className="footer-item">
                        <p className="institute-name">Nutan Maharashtra Institute of Engineering & Technology</p>
                        <p className="institute-detail">📍 Talegaon Dabhade, Pune - 410507</p>
                        <p className="institute-detail">📞 02114-231666</p>
                        <p className="institute-detail">✉️ nmiettalegaon@gmail.com</p>
                        <p className="institute-detail">🌐 <a href="https://www.nmiet.edu.in/" target="_blank" rel="noopener noreferrer">www.nmiet.edu</a></p>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© Made with Sweat, Blood and ❤️</p>
            </div>
        </footer>
    );
}
