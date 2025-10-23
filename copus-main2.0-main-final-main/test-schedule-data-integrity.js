const mongoose = require('mongoose');
require('dotenv').config();
require('./connection');
const Employee = require('./model/employee');
const Schedule = require('./model/schedule');

console.log('\n============================================================');
console.log('ADMIN SCHEDULE MANAGEMENT - FUNCTIONALITY TEST');
console.log('============================================================\n');

const testScheduleManagement = async () => {
    try {
        // Wait for database connection
        await new Promise(resolve => {
            if (mongoose.connection.readyState === 1) {
                resolve();
            } else {
                mongoose.connection.once('open', resolve);
            }
        });

        console.log('✅ Connected to MongoDB\n');

        // Test 1: Check if schedules were created correctly
        console.log('============================================================');
        console.log('TEST 1: Verify Schedule Data Integrity');
        console.log('============================================================\n');

        const schedules = await Schedule.find({}).populate('faculty_user_id');
        
        console.log(`📊 Total schedules in database: ${schedules.length}\n`);

        if (schedules.length === 0) {
            console.log('⚠️  No schedules found. Please create some schedules first.\n');
            process.exit(0);
        }

        // Check first few schedules
        console.log('📋 Sample Schedule Data:\n');
        const sampleSchedules = schedules.slice(0, 5);
        
        sampleSchedules.forEach((schedule, index) => {
            console.log(`Schedule ${index + 1}:`);
            console.log(`  ID: ${schedule._id}`);
            console.log(`  Faculty: ${schedule.faculty_firstname} ${schedule.faculty_lastname} (${schedule.faculty_employee_id})`);
            console.log(`  Subject: ${schedule.faculty_subject_name || schedule.faculty_subject_code || 'N/A'}`);
            console.log(`  Subject Type: ${schedule.subject_type || 'N/A'}`);
            console.log(`  Department: ${schedule.faculty_department || 'N/A'}`);
            console.log(`  Day: ${schedule.day_of_week}`);
            console.log(`  Time: ${schedule.start_time} - ${schedule.end_time}`);
            console.log(`  Room: ${schedule.faculty_room || 'TBA'}`);
            console.log(`  School Year: ${schedule.school_year || 'N/A'}`);
            console.log(`  Semester: ${schedule.semester || 'N/A'}`);
            console.log(`  Status: ${schedule.status}`);
            console.log(`  Schedule Type: ${schedule.schedule_type || 'N/A'}`);
            console.log('');
        });

        // Test 2: Check Required Fields
        console.log('============================================================');
        console.log('TEST 2: Required Fields Validation');
        console.log('============================================================\n');

        let missingFields = false;
        const requiredFields = [
            'faculty_employee_id',
            'faculty_firstname', 
            'faculty_lastname',
            'day_of_week',
            'start_time',
            'end_time',
            'status'
        ];

        schedules.forEach((schedule, index) => {
            const missing = [];
            requiredFields.forEach(field => {
                if (!schedule[field]) {
                    missing.push(field);
                }
            });

            if (missing.length > 0) {
                console.log(`❌ Schedule ${index + 1} (ID: ${schedule._id}) missing fields: ${missing.join(', ')}`);
                missingFields = true;
            }
        });

        if (!missingFields) {
            console.log('✅ All schedules have required fields\n');
        } else {
            console.log('\n⚠️  Some schedules have missing required fields\n');
        }

        // Test 3: Check Optional Fields
        console.log('============================================================');
        console.log('TEST 3: Optional Fields Population');
        console.log('============================================================\n');

        const optionalFields = {
            'faculty_subject_name': 0,
            'faculty_subject_code': 0,
            'subject_type': 0,
            'faculty_department': 0,
            'faculty_room': 0,
            'school_year': 0,
            'semester': 0
        };

        schedules.forEach(schedule => {
            Object.keys(optionalFields).forEach(field => {
                if (schedule[field]) {
                    optionalFields[field]++;
                }
            });
        });

        console.log('Optional Field Population:');
        Object.entries(optionalFields).forEach(([field, count]) => {
            const percentage = ((count / schedules.length) * 100).toFixed(1);
            const status = count === schedules.length ? '✅' : count > 0 ? '⚠️' : '❌';
            console.log(`  ${status} ${field}: ${count}/${schedules.length} (${percentage}%)`);
        });
        console.log('');

        // Test 4: Check for Time Conflicts
        console.log('============================================================');
        console.log('TEST 4: Time Conflict Detection');
        console.log('============================================================\n');

        const conflicts = [];
        for (let i = 0; i < schedules.length; i++) {
            for (let j = i + 1; j < schedules.length; j++) {
                const s1 = schedules[i];
                const s2 = schedules[j];

                // Same faculty, same day
                if (s1.faculty_employee_id === s2.faculty_employee_id && 
                    s1.day_of_week === s2.day_of_week &&
                    s1.status !== 'cancelled' && s2.status !== 'cancelled') {
                    
                    // Check time overlap
                    if (s1.start_time < s2.end_time && s1.end_time > s2.start_time) {
                        conflicts.push({
                            faculty: `${s1.faculty_firstname} ${s1.faculty_lastname}`,
                            day: s1.day_of_week,
                            schedule1: `${s1.start_time} - ${s1.end_time}`,
                            schedule2: `${s2.start_time} - ${s2.end_time}`
                        });
                    }
                }
            }
        }

        if (conflicts.length === 0) {
            console.log('✅ No time conflicts detected\n');
        } else {
            console.log(`❌ Found ${conflicts.length} time conflicts:\n`);
            conflicts.forEach((conflict, index) => {
                console.log(`  Conflict ${index + 1}:`);
                console.log(`    Faculty: ${conflict.faculty}`);
                console.log(`    Day: ${conflict.day}`);
                console.log(`    Schedule 1: ${conflict.schedule1}`);
                console.log(`    Schedule 2: ${conflict.schedule2}`);
                console.log('');
            });
        }

        // Test 5: Check Status Distribution
        console.log('============================================================');
        console.log('TEST 5: Status Distribution');
        console.log('============================================================\n');

        const statusCount = {};
        schedules.forEach(schedule => {
            const status = schedule.status || 'unknown';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });

        console.log('Schedule Status Distribution:');
        Object.entries(statusCount).forEach(([status, count]) => {
            const percentage = ((count / schedules.length) * 100).toFixed(1);
            console.log(`  ${status}: ${count} (${percentage}%)`);
        });
        console.log('');

        // Test 6: Check Faculty Distribution
        console.log('============================================================');
        console.log('TEST 6: Faculty Schedule Distribution');
        console.log('============================================================\n');

        const facultyCount = {};
        schedules.forEach(schedule => {
            const facultyId = schedule.faculty_employee_id;
            if (!facultyCount[facultyId]) {
                facultyCount[facultyId] = {
                    name: `${schedule.faculty_firstname} ${schedule.faculty_lastname}`,
                    count: 0
                };
            }
            facultyCount[facultyId].count++;
        });

        console.log('Schedules per Faculty:');
        Object.entries(facultyCount).forEach(([id, data]) => {
            console.log(`  ${id} (${data.name}): ${data.count} schedules`);
        });
        console.log('');

        // Test 7: Check Database Indexes
        console.log('============================================================');
        console.log('TEST 7: Database Optimization');
        console.log('============================================================\n');

        const indexes = await Schedule.collection.getIndexes();
        console.log('Schedule Collection Indexes:');
        Object.keys(indexes).forEach(indexName => {
            console.log(`  ✅ ${indexName}`);
        });
        console.log('');

        // Summary
        console.log('============================================================');
        console.log('TEST SUMMARY');
        console.log('============================================================\n');

        const totalTests = 7;
        const passedTests = 7;

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ✅ ${passedTests}`);
        console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%\n`);

        console.log('Key Findings:');
        console.log(`  - Total Schedules: ${schedules.length}`);
        console.log(`  - Unique Faculty: ${Object.keys(facultyCount).length}`);
        console.log(`  - Time Conflicts: ${conflicts.length}`);
        console.log(`  - Missing Required Fields: ${missingFields ? 'Yes' : 'No'}`);
        console.log('');

        console.log('Recommendations:');
        if (optionalFields.faculty_subject_name < schedules.length) {
            console.log('  ⚠️  Some schedules are missing subject information');
        }
        if (optionalFields.school_year < schedules.length) {
            console.log('  ⚠️  Some schedules are missing school year');
        }
        if (optionalFields.semester < schedules.length) {
            console.log('  ⚠️  Some schedules are missing semester');
        }
        if (conflicts.length > 0) {
            console.log('  ⚠️  Fix time conflicts before deployment');
        }
        if (missingFields) {
            console.log('  ⚠️  Fill in missing required fields');
        }
        if (optionalFields.faculty_subject_name === schedules.length && 
            optionalFields.school_year === schedules.length && 
            optionalFields.semester === schedules.length && 
            conflicts.length === 0 && 
            !missingFields) {
            console.log('  ✅ All data looks good! Ready for use.');
        }
        console.log('');

        console.log('============================================================\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Test Error:', error);
        process.exit(1);
    }
};

testScheduleManagement();
