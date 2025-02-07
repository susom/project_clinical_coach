import React from 'react';
import './ThinkingHabitsOverview.css';

// Helper: Map reflections to habits
function mapReflectionsToHabits(reflections, colorMap = { '1': 'red', '2': 'yellow', '3': 'green' }) {
  return [
    { label: 'Mind', color: colorMap[reflections?.mind?.score] || 'gray' },
    { label: 'Knowledge', color: colorMap[reflections?.knowledge?.score] || 'gray' },
    { label: 'Problem', color: colorMap[reflections?.problem?.score] || 'gray' },
    { label: 'Strategy', color: colorMap[reflections?.strategy?.score] || 'gray' },
    { label: 'Solution', color: colorMap[reflections?.solution?.score] || 'gray' },
    { label: 'Data', color: colorMap[reflections?.data?.score] || 'gray' },
  ];
}

function ThinkingHabitsOverview({ reflections, colorMap }) {
  const habits = mapReflectionsToHabits(reflections, colorMap);
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
