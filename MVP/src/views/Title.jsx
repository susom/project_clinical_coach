import Header from '../components/Header';
import TitleFooter from '../components/TitleFooter';
import './Title.css';
import thmGraphic from '../assets/images/thm_graphic.png';
import { useNavigate } from 'react-router-dom';

export default function Title() {
    const navigate = useNavigate(); // Hook for navigation

    return (
        <>
            <Header showBack={false} />
            <main id="title">
                <div className="content">
                    <img src={thmGraphic} alt="THM Graphic" className="graphic" />
                    <h1>Clinical Coach</h1>
                </div>
                <button className="login-button" onClick={() => navigate('/home')}>
                    Enter
                </button>
            </main>
            <TitleFooter />
        </>
    );
}
