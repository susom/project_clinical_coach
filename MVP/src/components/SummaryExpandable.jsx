import React, { useState } from 'react';

const SummaryExpandable = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    const TRUNCATE_THRESHOLD = 120;
    const isTruncated = !expanded && text.length > TRUNCATE_THRESHOLD;
    const displayText = isTruncated ? text.substring(0, TRUNCATE_THRESHOLD) + "..." : text;

    return (
        <div className="report-description" style={{ marginTop: '0.5rem' }}>
            <div>{displayText}</div>
            {text.length > TRUNCATE_THRESHOLD && (
                <a onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer', color: '#646cff', fontWeight: 'bold' }}>
                    {expanded ? ' Show Less -' : ' Show More +' }
                </a>
            )}
        </div>
    );
};

export default SummaryExpandable; // ✅ Fix export
