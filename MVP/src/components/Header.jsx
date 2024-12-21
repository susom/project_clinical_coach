import React from 'react';
import './Header.css';

function Header({ showBack = false, showFilter = false }) {
    return (
        <header className="header">
            {showBack && (
                <button className="back-button">
                    <span className="arrow">←</span> Back
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
