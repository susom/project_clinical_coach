import React from 'react';
import './ThinkingHabitsOverview.css';

function ThinkingHabitsOverview({ habits }) {
    return (
        <div className="thinking-habits-overview">
            {habits.map((habit, index) => (
                <div key={index} style={{ textAlign: 'center' }}>
                    <div className={`habit-item ${habit.color}`}></div>
                    <div className="habit-label">{habit.label}</div>
                </div>
            ))}
        </div>
    );
}

export default ThinkingHabitsOverview;
