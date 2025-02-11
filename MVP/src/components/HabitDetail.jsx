import { useEffect } from "react";

export default function HabitDetail({ habit, onClose }) {
    useEffect(() => {
        document.body.style.overflow = "hidden"; // Prevent scrolling
        return () => { document.body.style.overflow = "auto"; };
    }, []);

    return (
        <div className="habit-detail-overlay" onClick={onClose}>
            <div className="habit-detail-modal" onClick={(e) => e.stopPropagation()}>
                <button className="habit-close" onClick={onClose}>✕</button>
                <div className='inner'>
                    <h2>Thinking Habit:</h2>
                    <h3>{habit.title}</h3>
                    
                    <h4>Targeted Questions:</h4>
                    <ul>
                        {habit.questions.map((q, index) => (
                            <li key={index}>{q}</li>
                        ))}
                    </ul>
                    <h4>Definition:</h4>
                    <div className="habit-detail-definition">
                        {habit.definition.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>

                    <div className="habit-tags">
                        {habit.tags.map((tag, index) => (
                            <span key={index} className="habit-tag">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
