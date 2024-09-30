import React from 'react';
import { useStudents } from '../contexts/Students';  // Adjust the import path as necessary

const scoreColors = {
    3: 'green',
    2: '#FFD700',
    1: 'red'
};

const StatusIndicator = () => {
    const { selectedStudent } = useStudents();

    if (!selectedStudent || !selectedStudent.reflections) {
        return <div>No data available</div>;
    }

    const { reflections } = selectedStudent;

    return (
        <div className="status-indicator">
            {Object.entries(reflections).map(([key, { score }]) => (
                <div key={key} style={{ textAlign: 'center' }}>
                    <div
                        className="status-bar"
                        style={{ backgroundColor: scoreColors[score] }}
                    />
                    <div className="status-label">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StatusIndicator;
