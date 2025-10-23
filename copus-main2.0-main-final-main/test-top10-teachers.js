// Test Top 10 Teachers Calculation
require('dotenv').config();
const mongoose = require('mongoose');
const CopusResult = require('./model/copusResult');

async function testTop10Teachers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('📊 Fetching all COPUS results with percentages...');
        const allResults = await CopusResult.find({
            student_action_percentage: { $exists: true, $ne: null },
            teacher_action_percentage: { $exists: true, $ne: null }
        })
        .select('faculty_name faculty_department subject_name year semester student_action_percentage teacher_action_percentage calculated_overall_percentage')
        .lean();

        console.log(`Found ${allResults.length} COPUS results:\n`);
        
        // Display all results
        allResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.faculty_name}`);
            console.log(`   Department: ${result.faculty_department || 'N/A'}`);
            console.log(`   Subject: ${result.subject_name || 'N/A'}`);
            console.log(`   Year: ${result.year || 'N/A'}, Semester: ${result.semester || 'N/A'}`);
            console.log(`   Student Action: ${result.student_action_percentage}%`);
            console.log(`   Teacher Action: ${result.teacher_action_percentage}%`);
            console.log(`   Overall: ${result.calculated_overall_percentage}%`);
            console.log('');
        });

        // Group by faculty AND subject (per-subject ranking)
        console.log('🧮 Calculating averages per faculty-subject combination...\n');
        const facultySubjectMap = {};

        allResults.forEach(result => {
            const subject = result.subject_name || result.subject || 'Unknown Subject';
            const facultyKey = `${result.faculty_name}|||${subject}`;
            
            if (!facultySubjectMap[facultyKey]) {
                facultySubjectMap[facultyKey] = {
                    faculty_name: result.faculty_name,
                    department: result.faculty_department || result.department || 'N/A',
                    subject: subject,
                    results: [],
                    semesters: new Set(),
                    years: new Set()
                };
            }

            facultySubjectMap[facultyKey].results.push({
                student_action_percentage: result.student_action_percentage,
                teacher_action_percentage: result.teacher_action_percentage,
                calculated_overall_percentage: result.calculated_overall_percentage,
                semester: result.semester,
                year: result.year
            });

            if (result.semester) facultySubjectMap[facultyKey].semesters.add(result.semester);
            if (result.year) facultySubjectMap[facultyKey].years.add(result.year);
        });

        // Calculate averages for each faculty-subject combination
        const facultyAverages = Object.values(facultySubjectMap).map(entry => {
            const numResults = entry.results.length;
            
            const avgStudentAction = entry.results.reduce((sum, r) => sum + (r.student_action_percentage || 0), 0) / numResults;
            const avgTeacherAction = entry.results.reduce((sum, r) => sum + (r.teacher_action_percentage || 0), 0) / numResults;
            const avgOverall = entry.results.reduce((sum, r) => sum + (r.calculated_overall_percentage || 0), 0) / numResults;

            const mostRecentSemester = Array.from(entry.semesters).sort().pop() || 'N/A';
            const mostRecentYear = Array.from(entry.years).sort().pop() || 'N/A';

            return {
                faculty_name: entry.faculty_name,
                department: entry.department,
                subject: entry.subject,
                semester: mostRecentSemester,
                year: mostRecentYear,
                student_action_avg: Math.round(avgStudentAction * 100) / 100,
                teacher_action_avg: Math.round(avgTeacherAction * 100) / 100,
                overall_avg: Math.round(avgOverall * 100) / 100,
                num_observations: numResults,
                combined_avg: Math.round(((avgStudentAction + avgTeacherAction) / 2) * 100) / 100
            };
        });

        // Sort by combined average (descending) first
        const sortedFacultySubjects = facultyAverages
            .sort((a, b) => b.combined_avg - a.combined_avg);

        // Filter to get unique teachers (no duplicates) - keep only the highest-ranked subject per teacher
        const seenTeachers = new Set();
        const top10 = [];

        for (const entry of sortedFacultySubjects) {
            if (!seenTeachers.has(entry.faculty_name)) {
                top10.push(entry);
                seenTeachers.add(entry.faculty_name);
                
                if (top10.length >= 10) {
                    break;
                }
            }
        }

        console.log('🏆 TOP 10 UNIQUE TEACHERS (Ranked Per Subject, No Duplicates)\n');
        console.log('📌 Note: Each teacher appears only once with their highest-ranked subject\n');
        console.log('═'.repeat(100));
        
        top10.forEach((teacher, index) => {
            const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            console.log(`${trophy} Rank ${index + 1}: ${teacher.faculty_name} - ${teacher.subject}`);
            console.log(`   Department: ${teacher.department}`);
            console.log(`   Year: ${teacher.year}, Semester: ${teacher.semester}`);
            console.log(`   Student Action Avg: ${teacher.student_action_avg}%`);
            console.log(`   Teacher Action Avg: ${teacher.teacher_action_avg}%`);
            console.log(`   Overall Avg: ${teacher.overall_avg}%`);
            console.log(`   Combined Avg (Ranking): ${teacher.combined_avg}%`);
            console.log(`   Number of Observations: ${teacher.num_observations}`);
            console.log('─'.repeat(100));
        });

        if (top10.length === 0) {
            console.log('⚠️  No teachers with COPUS results found!');
            console.log('💡 Make sure to complete COPUS observations with percentage calculations.');
        }

        await mongoose.connection.close();
        console.log('\n✅ Test completed!');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testTop10Teachers();
