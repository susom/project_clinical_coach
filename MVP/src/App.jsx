import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { CoachProvider } from './contexts/Coach';
import { StudentsProvider } from './contexts/Students';
import { ConfirmModalProvider } from './contexts/ConfirmModal';

import Title from './views/Title';
import Home from './views/Home';
import Recording from './views/Recording';
import THM from './views/ThinkingHabitsMatrix';
import Notifications from './views/Notifications';
import Profile from './views/Profile';
import Report from './views/Report';
import StudentProfile from "./views/StudentProfile";

function App() {
    return (
        <CoachProvider>
            <StudentsProvider>
                <ConfirmModalProvider>
                    <Router>
                        <div id="clinicalcoachmvp_container">
                            <Routes>
                                <Route path="/" element={<Title />} />
                                <Route path="/home" element={<Home />} />
                                <Route path="/recording" element={<Recording />} />
                                <Route path="/thinking-habits" element={<THM />} />
                                <Route path="/notifications" element={<Notifications />} />
                                <Route path="/coach-profile" element={<Profile />} />
                                <Route path="/report" element={<Report />} />
                                <Route path="/students-profile" element={<StudentProfile />} />
                            </Routes>
                        </div>
                    </Router>
                </ConfirmModalProvider>
            </StudentsProvider>
        </CoachProvider>
    );

}

export default App;
