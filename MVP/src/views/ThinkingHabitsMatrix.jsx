import Header from '../components/Header';
import Footer from '../components/Footer';
import './THM.css';
import thmGraphic from '../assets/images/thm_graphic.png';

export default function THM() {
    const handleMoreClick = (title) => {
        // Placeholder logic
        console.log(`More button clicked for: ${title}`);

        // Future options:
        // 1. Expand the box:
        // setExpandedCard((prev) => (prev === title ? null : title));

        // 2. Navigate to a detailed view:
        // navigate(`/details/${title.toLowerCase().replace(/\s/g, '-')}`);

        // 3. Open an external URL:
        // window.open('https://example.com', '_blank');
    };


    return (
        <>
            <Header showBack={false} />
            <main id="thm">
                <section className="thm-header">
                    <img src={thmGraphic} alt="THM Graphic" className="thm-graphic" />
                    <h1>Thinking Habits Matrix</h1>
                    <div className="thm-subtitle">
                        Self-Reflective Thinking Habits For A Thinking Mindset:
                    </div>
                </section>
                <section className="thm-cards">
                    {[
                        {
                            title: 'Frame Of Mind',
                            questions: ['Am I focused?', 'Am I tired, overwhelmed, distracted, upset, or worried?'],
                            tags: ['History', 'Physical'],
                        },
                        {
                            title: 'Knowledge',
                            questions: ['What information do I have?', 'What information do I need?', 'Do I need other expertise?'],
                            tags: ['History', 'Physical'],
                        },
                        {
                            title: 'Problem-Definition & Assumptions',
                            questions: [
                                'Is this the most important problem to solve?',
                                'How sick is the patient?',
                                'Is this a simple or complicated problem?',
                            ],
                            tags: ['History', 'Physical', 'DDx'],
                        },
                        {
                            title: 'Strategy',
                            questions: ['What frameworks should I use to solve this problem?', 'Can I explain the mechanism?'],
                            tags: ['DDx', 'Working DDx'],
                        },
                        {
                            title: 'Solution',
                            questions: [
                                'Does the working diagnosis make sense? If not, what is missing?',
                                'What is my rationale for the interventions that I am planning? What do I expect?',
                            ],
                            tags: ['DDx', 'Working DDx', 'Plan'],
                        },
                        {
                            title: 'Data',
                            questions: ['Does the story still fit the new findings?', 'Is this what I expected?'],
                            tags: ['Results', 'Progression'],
                        },
                    ].map((card, index) => (
                        <div key={index} className="thm-card">
                            <div className="thm-card-header">
                                <h2>{card.title}</h2>
                                <button className="thm-more-button"
                                        onClick={() => handleMoreClick(card.title)}>+ More</button>
                            </div>
                            <ul>
                                {card.questions.map((question, qIndex) => (
                                    <li key={qIndex}>{question}</li>
                                ))}
                            </ul>
                            <div className="thm-tags">
                                {card.tags.map((tag, tIndex) => (
                                    <span key={tIndex} className="thm-tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            </main>
            <Footer />
        </>
    );
}
