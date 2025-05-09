import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import { useCoach } from '../contexts/Coach';
import { useStudents } from '../contexts/Students';
import RecordingFooter from './RecordingFooter';
import './Footer.css';
import thmIcon from '../assets/images/thm_icon_2.png';

function Footer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { stage, setStage } = useCoach(); 
    const { setIsProcessing, isProcessing, setHasNewNotifications, hasNewNotifications } = useStudents();
    const currentPath = location.pathname.toLowerCase();
    const isExpanded = stage > 1; // Keep expanded state driven by `stage`

    // Determine which nav item should be active
    const isRecordingActive = stage >= 3;

    return (
        <footer className={`footer-container ${isExpanded ? 'expanded' : ''}`}>
            {stage === 1 && (
                <div className="start-recording-container">
                    <button className="start-recording-button" onClick={() => {
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
                    className={`footer-item ${!isRecordingActive && currentPath === '/home' ? 'active' : ''}`}
                    onClick={() => setStage(1)}
                >
                    <i className="fas fa-home footer-icon"></i>
                    <span>Home</span>
                </Link>
                <Link
                    className={`footer-item ${isRecordingActive ? 'active' : ''}`}
                    onClick={() => {
                        setStage(2);
                    }}
                >
                    <i className="fas fa-microphone footer-icon"></i>
                    <span>Recording</span>
                </Link>
                <Link
                    to="/thinking-habits"
                    className={`footer-item ${!isRecordingActive && currentPath === '/thinking-habits' ? 'active' : ''}`}
                    onClick={() => setStage(1)}
                >
                    <img src={thmIcon} alt="THM" className="footer-icon thm" />
                    <span>THM</span>
                </Link>
                <Link
                    to="/notifications"
                    className={`footer-item ${!isRecordingActive && currentPath === '/notifications' ? 'active' : ''}`}
                    onClick={() => setStage(1)}
                >
                    <div className="footer-icon notification-wrapper">
                        <i className="fas fa-bell"></i>
                        {isProcessing && <i className="fas fa-sync-alt spinning overlay-icon" />}
                        {!isProcessing && hasNewNotifications && <b className="notification-dot"></b>}
                    </div>
                    <span>Notifications</span>
                </Link>
                <Link
                    to="/coach-profile"
                    className={`footer-item ${!isRecordingActive && currentPath === '/coach-profile' ? 'active' : ''}`}
                    onClick={() => setStage(1)}
                >
                    <i className="fas fa-user footer-icon"></i>
                    <span>Profile</span>
                </Link>
            </nav>
        </footer>
    );
}

export default Footer;
