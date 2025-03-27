import Header from '../components/Header';
import Footer from '../components/Footer';
import { useConfirmModal } from '../contexts/ConfirmModal';
import { useCoach } from '../contexts/Coach';
import './Profile.css';

export default function Profile() {
    const { coach } = useCoach();
    const { showConfirmModal } = useConfirmModal();

    // Placeholder callbacks for button actions
    const handleManageProfile = () => {
        console.log('Manage Profile clicked');
        // Add functionality here
    };

    const handleAppSettings = () => {
        console.log('App Settings clicked');
        // Add functionality here
    };

    const handleAccount = () => {
        console.log('Account clicked');
        // Add functionality here
    };

    const handleHelp = () => {
        console.log('Help clicked');
        // Add functionality here
    };

    const handleAbout = () => {
        console.log('About clicked');
        // Add functionality here
    };

    const handleFeedback = () => {
        if (window.feedbackURL) {
            window.open(window.feedbackURL, '_blank');
        }
    };

    const handleLogout = async () => {
        const confirmed = await showConfirmModal({
            title: 'Logout Now?',
            message: 'Are you sure you want to log out?',
            showConfirm: true,
            showCancel: true,
            confirmText: 'Yes',
            cancelText: 'No',
        });

        if (confirmed) {
            console.log('User logged out');
            // Add your logout functionality here
        } else {
            console.log('User canceled logout');
        }
    };

    return (
        <>
            <Header showBack={false} />
            <main id="profile">
                <section className="profile-header">
                    <div className="profile-picture">
                        {coach.profilePicture ? (
                            <img src={coach.profilePicture} alt={coach.name}/>
                        ) : (
                            <i className="fas fa-user-circle"></i>
                        )}
                    </div>
                    <h2 className="profile-name">{coach.name}</h2>
                    <p className="profile-role">{coach.role}</p>
                </section>
                <section className="profile-options">
                    <button className="profile-option" onClick={handleManageProfile}>
                        <i className="fas fa-pencil-alt"></i>
                        <span>Manage Profile</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    <button className="profile-option" onClick={handleAppSettings}>
                    <i className="fas fa-cog"></i>
                        <span>App Settings</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    <button className="profile-option" onClick={handleAccount}>
                        <i className="fas fa-user"></i>
                        <span>Account</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    <button className="profile-option" onClick={handleHelp}>
                        <i className="fas fa-question-circle"></i>
                        <span>Help</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    {window.feedbackURL && (
                    <button className="profile-option" onClick={handleFeedback}>
                        <i className="fas fa-info-circle"></i>
                        <span>Submit Feedback</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    )}
                    <button className="profile-option logout" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Log Out</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </section>
            </main>
            <Footer />
        </>
    );
}
