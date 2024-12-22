import React, { createContext, useContext, useState } from 'react';

// Create the context
const CoachContext = createContext();

// Custom hook to use the CoachContext
export const useCoach = () => useContext(CoachContext);

// Provider component to wrap the app
export const CoachProvider = ({ children }) => {
    const [coach, setCoach] = useState({
        record_id: 1,
        name: "Keanu Reeves",
        role: "The One at the Hospital",
        profilePicture: null, // Placeholder for future profile picture
        email: "judy.hopkins@example.com",
        phone: "555-123-4567",
        bio: "Experienced mentor helping young professionals grow their skills.",
        settings: {
            notificationsEnabled: true,
            theme: "light",
        },
    });

    const updateCoachProfile = (updatedProfile) => {
        setCoach((prevCoach) => ({
            ...prevCoach,
            ...updatedProfile,
        }));
    };

    return (
        <CoachContext.Provider
            value={{
                coach,
                updateCoachProfile
            }}
        >
            {children}
        </CoachContext.Provider>
    );
};
