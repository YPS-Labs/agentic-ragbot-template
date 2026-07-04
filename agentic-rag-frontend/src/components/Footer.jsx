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
            email: 'poojapote18@gmail.com',
            linkedin: '#',
            github: '#'
        },
        {
            name: 'Yasir Shaikh',
            email: 'yasirshaikhpune@gmail.com',
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
                        <p className="institute-name">Institute </p>
                        <p className="institute-detail">🌐 <a href="https://www.college.edu.in/" target="_blank" rel="noopener noreferrer">www.college.edu</a></p>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© Made with Sweat, Blood and ❤️</p>
            </div>
        </footer>
    );
}
