import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import TitleFooter from '../components/TitleFooter';

import { useCoach } from '../contexts/Coach';
import './Title.css';

export default function Title() {
    const navigate = useNavigate();
    const { updateCoachProfile } = useCoach();
    const [coach, setCoach] = useState(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (window.coachesList && Array.isArray(window.coachesList)) {
                if (window.coachesList.length > 0) {
                    setCoach(window.coachesList[0]);
                } else {
                    setCoach({ record_id: null, fname: window.USERID, lname: "(Not Found)" });
                }
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const handleEnterApp = async () => {
        if (!coach || !coach.record_id) return;

        try {
            const fullCoachData = await window.ExternalModules.Stanford.ClinicalCoach.fetchCoachData(coach.record_id);

            updateCoachProfile({
                record_id: fullCoachData.record_id,
                name: `${fullCoachData.fname} ${fullCoachData.lname}`,
                profilePicture: fullCoachData.coach_pic || null,
                profession: fullCoachData.coach_profession || "",
                institution: fullCoachData.coach_institution || ""
            });

            navigate("/home");
        } catch (err) {
            console.error("Error fetching coach data", err);
        }
    };

    return (
        <>
            <Header showBack={false} isTitle={true} />
            <main id="title">
                <div className="content">
                    <h1>Clinical Coach</h1>

                    {coach?.record_id ? (
                        <div className="coach-info">
                            <h2>Hi, {coach.fname} {coach.lname}</h2>
                            <button className="enter-app-btn login-button" onClick={handleEnterApp}>Log In</button>
                            <button className="enter-app-btn login-button" onClick={handleEnterApp}>Sign Up</button>
                        </div>
                    ) : (
                        <div className="coach-info">
                            <h2>Sorry, <b>{coach?.fname}</b> was not found...</h2>
                        </div>
                    )}
                </div>
            </main>
            <TitleFooter />
        </>
    );
}
