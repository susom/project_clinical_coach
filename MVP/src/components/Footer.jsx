import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import RecordingFooter from './RecordingFooter';
import './Footer.css';
import thmIcon from '../assets/images/thm_icon.png';

function Footer({ stage = 1, setStage }) {
    const location = useLocation();
    const currentPath = location.pathname.toLowerCase();

    const isExpanded = stage > 1; // Keep expanded state driven by `stage`

    return (
        <footer className={`footer-container ${isExpanded ? 'expanded' : ''}`}>
            {isExpanded && (
                <div className="expanded-content">
                    <RecordingFooter stage={stage} setStage={setStage} />
                </div>
            )}
            <nav className="global-nav">
                <Link
                    to="/home"
                    className={`footer-item ${currentPath === '/home' ? 'active' : ''}`} // Remove stage check here
                    onClick={() => setStage(2)} // Retain stage reset logic
                >
                    <i className="fas fa-home footer-icon"></i>
                    <span>Home</span>
                </Link>
                <Link
                    to="/recording"
                    className={`footer-item ${currentPath === '/recording' ? 'active' : ''}`}
                    onClick={() => setStage(2)} // Set stage to 2 for recording
                >
                    <i className="fas fa-microphone footer-icon"></i>
                    <span>Recording</span>
                </Link>
                <Link
                    to="/thinking-habits"
                    className={`footer-item ${currentPath === '/thinking-habits' ? 'active' : ''}`}
                    onClick={() => setStage(1)} // Reset stage when navigating
                >
                    <img src={thmIcon} alt="THM" className="footer-icon thm" />
                    <span>THM</span>
                </Link>
                <Link
                    to="/notifications"
                    className={`footer-item ${currentPath === '/notifications' ? 'active' : ''}`}
                    onClick={() => setStage(1)} // Reset stage when navigating
                >
                    <i className="fas fa-bell footer-icon"></i>
                    <span>Notifications</span>
                </Link>
                <Link
                    to="/coach-profile"
                    className={`footer-item ${currentPath === '/coach-profile' ? 'active' : ''}`}
                    onClick={() => setStage(1)} // Reset stage when navigating
                >
                    <i className="fas fa-user footer-icon"></i>
                    <span>Profile</span>
                </Link>
            </nav>
        </footer>
    );
}

export default Footer;
