import React from 'react';
import './TitleFooter.css';

function TitleFooter() {
    return (
        <footer className="title-footer">
            <nav className="title-footer-links">
                <a href="#about">About</a>
                <a href="#settings">Settings</a>
            </nav>
            <p className="title-footer-copyright">
                Clinical Coach © 2024-2025
            </p>
        </footer>
    );
}

export default TitleFooter;
