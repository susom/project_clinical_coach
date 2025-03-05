import React from 'react';
import './ReflectionScoreChart.css';

const REFLECTION_CATEGORIES = [
  'strategy',
  'solution',
  'knowledge',
  'data',
  'problem',
  'mind'
];

export default function ReflectionsScoreChart({ sessions = [] }) {
  return (
    <div className="chart-container">
      {REFLECTION_CATEGORIES.map((category) => (
        <div key={category} className="score-row">
          <div className="reflection-label">{category.toUpperCase()}</div>
          <div className="score-line">
            <div className="score-blocks">
              {sessions.map((session, idx) => {
                const score = session?.reflections?.[category]?.score ?? null;
                if (!score) return <div key={idx} className="score-block empty" />;
                return <div key={idx} className={`score-block score-${score}`} />;
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
