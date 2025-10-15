import { useEffect } from "react";

export default function CaseSummary({ casePresentationSummary, onClose }) {
    useEffect(() => {
        document.body.style.overflow = "hidden"; // Prevent scrolling
        return () => { document.body.style.overflow = "auto"; };
    }, []);

    console.log("casePresentationSummary,", casePresentationSummary);
    return (
        <div className="case-summary-overlay" onClick={onClose}>
            <div className="case-summary-modal" onClick={(e) => e.stopPropagation()}>
                <button className="case-summary-close" onClick={onClose}>✕</button>
                <div className="case-summary-inner">
                    <h2>Case Presentation Summary:</h2>
                    <p>{casePresentationSummary.long_summary}</p>
                </div>

                <div className="case-summary-inner organization-assessment">
                    <h2>Organizational Assessment:</h2>
                    <p>{casePresentationSummary.organization_review}</p>
                </div>
            </div>
        </div>
    );
}
