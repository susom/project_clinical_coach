import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useStudents } from '../contexts/Students';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './FullTranscript.css';

export default function FullTranscript() {
    const navigate = useNavigate();
    const { category } = useParams();
    const { selectedStudent, selectedSession } = useStudents();

    if (!selectedStudent || !selectedSession) {
        console.warn("MISSING STUDENT OR SESSION, REDIRECTING TO HOME");
        navigate('/');
        return null; // Prevent render
    }

    const the_session = selectedStudent.sessions.find(s => String(s.session_id) === String(category));

    if (!the_session || !the_session.transcript) {
        return (
            <>
                <Header showBack={true} />
                <main id="full_transcript">
                    <div className="error-message">⚠️ No transcript available for this session.</div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header showBack={true} />
            <main id="full_transcript">
                <div className="transcript-header">
                    <div className="transcript-header-content">
                        <h2 className="transcript-name">{selectedStudent.name}’s </h2>
                        <span className="transcript-date">{the_session.session_date}<p>Full Transcript</p></span>
                    </div>
                </div>


                <section className="transcript-container">
                    <p className="error-warning">*POSSIBLE TRANSCRIPT ERRORS ARE [BRACKETED]</p>
                    {parseSRT(the_session.transcript).map(entry => (
                        <div key={entry.id} className="transcript-entry">
                            <span className="transcript-number">{entry.id}</span>
                            <div className="transcript-content">
                                <p className="transcript-time">{entry.timeRange}</p>
                                <p className="transcript-text">{entry.text}</p>
                            </div>
                        </div>
                    ))}
                </section>
            </main>
            <Footer />
        </>
    );
}

function parseSRT(srtText) {
    const entries = srtText.trim().split(/\n\s*\n/); // split by blank lines
    return entries.map((entry, idx) => {
        const lines = entry.split('\n');
        const number = lines[0];
        const [startRaw, endRaw] = (lines[1] || '').split(' --> ') || [];
        const start = startRaw?.split(',')[0] || '00:00:00';
        const end = endRaw?.split(',')[0] || '';
        const text = lines.slice(2).join(' ').trim();
        return {
            id: Number(number) || idx + 1,
            timeRange: `${start} → ${end}`,
            text
        };
    });
}
