import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import './Home.css';

export default function Home() {
    const [stage, setStage] = useState(2); // Default to stage 2 for the Home page


    // Grouped Reports Data
    const reportsData = [
        {
            date: "Today, September 10, 2024",
            reports: [
                {
                    studentName: 'Yaseem Amellal',
                    time: '1:05 PM',
                    description: '15-minute case presentation regarding 8-year-old patient in ICU.',
                    profilePicture: null,
                    status: 'conversation_processing',
                    statusColor: 'Yellow',
                    habits: [
                        { label: 'Strategy', color: 'green' },
                        { label: 'Solution', color: 'green' },
                        { label: 'Knowledge', color: 'green' },
                        { label: 'Problem', color: 'yellow' },
                        { label: 'Data', color: 'yellow' },
                        { label: 'Mind', color: 'red' },
                    ],
                },
                {
                    studentName: 'Jasmine Machado',
                    time: '12:45 PM',
                    description: '20-minute case presentation regarding 10-year-old patient with group-A strep.',
                    profilePicture: null,
                    status: 'coaching_insights_available',
                    statusColor: '#6C7CD7',
                    isNew:true,
                    habits: [
                        { label: 'Strategy', color: 'green' },
                        { label: 'Solution', color: 'green' },
                        { label: 'Knowledge', color: 'green' },
                        { label: 'Problem', color: 'yellow' },
                        { label: 'Data', color: 'yellow' },
                        { label: 'Mind', color: 'red' },
                    ],
                },
            ],
        },
        {
            date: "Yesterday, September 9, 2024",
            reports: [
                {
                    studentName: 'Dennis Johnson',
                    time: '12:00 PM',
                    description: '8-minute case presentation patient with mastoiditis and complications.',
                    profilePicture: null,
                    status: 'review_coaching_insights',
                    statusColor: '#28a745',
                    habits: [
                        { label: 'Strategy', color: 'green' },
                        { label: 'Solution', color: 'green' },
                        { label: 'Knowledge', color: 'green' },
                        { label: 'Problem', color: 'yellow' },
                        { label: 'Data', color: 'yellow' },
                        { label: 'Mind', color: 'red' },
                    ],
                },
            ],
        },
    ];

    return (
        <>
            <Header />
            <main id="home">
                <h1 className="center-title">Clinical Coach</h1>
                {reportsData.map((group, groupIndex) => (
                    <section key={groupIndex} className="report-group">
                        <div className="group-header">
                            <span className="group-title">
                                {groupIndex === 0 ? "Coaching Reports" : ""}
                            </span>
                            <span className="group-date">{group.date}</span>
                        </div>
                        <div className="report-list">
                            {group.reports.map((report, index) => (
                                <div className="report-card" key={`${groupIndex}-${index}`}>
                                    <div className="report-card-header">
                                        <div className="profile-picture">
                                            {report.profilePicture ? (
                                                <img src={report.profilePicture} alt={report.studentName}/>
                                            ) : (
                                                <i className="fas fa-user-circle"></i>
                                            )}
                                        </div>
                                        <div className="report-right-content">
                                            <div
                                                className={`report-status ${report.status === 'conversation_processing' ? 'processing' : ''} ${
                                                    report.isNew ? 'new' : ''
                                                }`}
                                                style={{backgroundColor: report.statusColor}}
                                            >
                                                {report.status.replace(/_/g, " ").toUpperCase()}
                                            </div>
                                            <ThinkingHabitsOverview habits={report.habits}/>
                                        </div>
                                    </div>
                                    <div className="report-details">
                                        <div className="report-student-name">{report.studentName}</div>
                                        <div className="report-meta">
                                            <p className="report-time">{report.time}</p>
                                            <p className="report-description">{report.description}</p>
                                        </div>
                                    </div>
                                </div>

                            ))}
                        </div>
                    </section>
                ))}
            </main>
            <Footer stage={stage} setStage={setStage} />
        </>
    );
}
