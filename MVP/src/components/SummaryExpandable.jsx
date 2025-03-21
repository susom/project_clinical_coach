import React, { useState } from 'react';

const SummaryExpandable = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    const TRUNCATE_THRESHOLD = 170;

    // ✅ Default Text for Empty Summaries
    if (!text || text.trim() === '') {
        return <div className="report-description" style={{ fontStyle: 'italic', color: 'gray' }}>No summary available</div>;
    }

    const isTruncated = !expanded && text.length > TRUNCATE_THRESHOLD;
    const displayText = isTruncated ? text.substring(0, TRUNCATE_THRESHOLD) + "..." : text;

    return (
        <div className="report-description">
            <div>{displayText}</div>
            {text.length > TRUNCATE_THRESHOLD && (
                <a
                    onClick={() => setExpanded(!expanded)}
                    style={{ cursor: 'pointer', color: '#646cff', fontWeight: 'bold' }}
                >
                    {expanded ? ' Show Less -' : ' Show More +' }
                </a>
            )}
        </div>
    );
};

export default SummaryExpandable;
