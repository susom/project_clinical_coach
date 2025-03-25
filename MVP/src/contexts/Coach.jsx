import React, { createContext, useContext, useState } from 'react';

// Create the context
const CoachContext = createContext();

// Custom hook to use the CoachContext
export const useCoach = () => useContext(CoachContext);

// Provider component to wrap the app
export const CoachProvider = ({ children }) => {
    const [coach, setCoach] = useState({});
    const [stage, setStage] = useState(1);

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
                updateCoachProfile,
                stage, 
                setStage
            }}
        >
            {children}
        </CoachContext.Provider>
    );
};
