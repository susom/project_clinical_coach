import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import RecordingFooter from './RecordingFooter';
import './Footer.css';
import thmIcon from '../assets/images/thm_icon.png';

function Footer({ stage = 1, setStage }) {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname.toLowerCase();

    const isExpanded = stage > 1; // Keep expanded state driven by `stage`

    return (
        <footer className={`footer-container ${isExpanded ? 'expanded' : ''}`}>
            {stage === 1 && (
                <div className="start-recording-container">
                    <button className="start-recording-button" onClick={() => {
                navigate('/home'); 
                setStage(2);
            }}>
                        START RECORDING <i className="fas fa-microphone"></i>
                    </button>
                </div>
            )}


            {isExpanded && (
                <div className="expanded-content">
                    <RecordingFooter stage={stage} setStage={setStage} />
                </div>
            )}
            <nav className="global-nav">
                <Link
                    to="/home"
                    className={`footer-item ${currentPath === '/home' ? 'active' : ''}`} // Remove stage check here
                    onClick={() => setStage(1)} // Retain stage reset logic
                >
                    <i className="fas fa-home footer-icon"></i>
                    <span>Home</span>
                </Link>
                <Link
                    className={`footer-item ${currentPath === '/recording' ? 'active' : ''}`}
                    onClick={() => {
                        navigate('/home'); 
                        setStage(2);
                    }}
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
