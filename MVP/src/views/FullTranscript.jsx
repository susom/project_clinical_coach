import React from 'react';
import { useParams } from 'react-router-dom';
import { useStudents } from '../contexts/Students';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './FullTranscript.css';

export default function FullTranscript() {
    const { category } = useParams();
    const { selectedStudent, selectedSession } = useStudents();
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
                    <div className="transcript-entry">
                        <span className="transcript-number">1</span>
                        <div className="transcript-content">
                            <p className="transcript-time">00:00:00</p>
                            <p className="transcript-text">
                                {the_session.transcript}
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
