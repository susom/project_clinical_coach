import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

function Header({ showBack = false, previousView = null, showFilter = false }) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (previousView) {
            navigate(previousView); // Go to the specified previous page
        } else {
            navigate(-1); // Default to browser history back
        }
    };

    return (
        <header className="header">
            {showBack && (
                <button className="back-button" onClick={handleBack}>
                    <span className="arrow"><i class="fas fa-chevron-left"></i></span> Back
                </button>
            )}
            {showFilter && (
                <button className="filter-button">
                    <i className="fas fa-filter"></i> Filter
                </button>
            )}
        </header>
    );
}

export default Header;
