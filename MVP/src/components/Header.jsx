import React from 'react';
import { useLocation, Link } from 'react-router-dom';

function Header() {
    const location = useLocation(); // Get current route information
    const { pathname } = location; // Get pathname directly

    const isHomeView = pathname === '/';  // Simplified check for home view
    const isReportView = pathname.startsWith('/report'); // Simplified check for report view

    return (
        <header style={isHomeView ? { padding: '2rem' } : { padding: '1rem' }}>
            {isHomeView && (
                <h1 style={{ fontSize: '3rem', margin: 0 }}>Clinical Coach</h1>
            )}
            {isReportView && (
                <nav style={{ textAlign: 'left' }}>
                    <Link to="/" style={{ textDecoration: 'none', color: '#007bff' }}>
                        ← Back
                    </Link>
                </nav>
            )}
        </header>
    );
}

export default Header;
