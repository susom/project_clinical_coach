import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Report from './components/Report';
import Header from './components/Header';
import Footer from './components/Footer';
import { StudentsProvider } from './contexts/Students';

function App() {
    return (
        <StudentsProvider>
            <Router>
                <div id="clinicalcoachmvp_container">
                    <Header />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/report" element={<Report />} />
                    </Routes>
                    <Footer />
                </div>
            </Router>
        </StudentsProvider>
    );
}

export default App;
