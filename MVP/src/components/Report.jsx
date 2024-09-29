import React from 'react';
import { useStudents } from '../contexts/Students';

function Report() {
    const { selectedStudent } = useStudents();

    if (!selectedStudent) {
        return <p>No student selected. Please go back and select a student.</p>;
    }

    return (
        <div>
            <h2>Report for {selectedStudent.name}</h2>
            {/* Display the student's report here */}
            <p>Report content goes here...</p>
        </div>
    );
}

export default Report;
