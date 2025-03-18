import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useCoach, CoachProvider } from './contexts/Coach';
import { useStudents, StudentsProvider } from './contexts/Students';
import { ConfirmModalProvider } from './contexts/ConfirmModal';

import Title from './views/Title';
import Home from './views/Home';
import Recording from './views/Recording';
import THM from './views/ThinkingHabitsMatrix';
import Notifications from './views/Notifications';
import Profile from './views/Profile';
import Report from './views/Report';
import DetailAnalysis from "./views/DetailAnalysis";
import FullTranscript from "./views/FullTranscript";
import StudentProfile from "./views/StudentProfile";

function Layout() {
    const { coach } = useCoach();
    const navigate = useNavigate();
    const { selectedStudent, selectedSession } = useStudents();
    const location = useLocation();

    useEffect(() => {
        if (!coach?.record_id && location.pathname !== '/') {
            console.warn("MISSING COACH, REDIRECTING TO HOME");
            navigate('/');
        }
    
        const sessionRequiredRoutes = ['/report', '/detail-analysis', '/full-transcript'];
        const studentRequiredRoutes = ['/students-profile', ...sessionRequiredRoutes]; 
    
        const isSessionRequired = sessionRequiredRoutes.some(route => location.pathname.startsWith(route));
        const isStudentRequired = studentRequiredRoutes.some(route => location.pathname.startsWith(route));
    
        if (isSessionRequired && (!selectedStudent || !selectedSession)) {
            console.warn("MISSING STUDENT OR SESSION, REDIRECTING TO HOME");
            navigate('/');
        } else if (isStudentRequired && !selectedStudent) {
            console.warn("MISSING STUDENT, REDIRECTING TO HOME");
            navigate('/');
        }
    }, [coach, location.pathname, navigate, selectedStudent, selectedSession]);
    
    return (
        <div id="clinicalcoachmvp_container">
            <Routes>
                <Route path="/" element={<Title />} />
                <Route path="/home" element={<Home />} />
                <Route path="/recording" element={<Recording />} />
                <Route path="/thinking-habits" element={<THM />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/coach-profile" element={<Profile />} />
                <Route path="/report" element={<Report />} />
                <Route path="/detail-analysis/:category" element={<DetailAnalysis />} />
                <Route path="/full-transcript/:category" element={<FullTranscript />} />
                <Route path="/students-profile" element={<StudentProfile />} />
            </Routes>
        </div>
    );
}

function App() {
    return (
        <Router>
            <CoachProvider>
                <StudentsProvider>
                    <ConfirmModalProvider>
                        {/* ✅ `Layout` is now inside CoachProvider, so useCoach() works */}
                        <Layout />
                    </ConfirmModalProvider>
                </StudentsProvider>
            </CoachProvider>
        </Router>
    );
}

export default App;
