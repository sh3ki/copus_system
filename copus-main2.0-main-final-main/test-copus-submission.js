// test-copus-submission.js
// This script tests the complete COPUS submission flow for Leo Garcia (EMP003)

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./model/employee');
const ObserverSchedule = require('./model/observerSchedule');
const CopusObservation = require('./model/copusObservation');
const CopusResult = require('./model/copusResult');

async function testCopusSubmission() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Find the users
        console.log('\n📋 Step 1: Finding users...');
        const faculty = await User.findOne({ employeeId: 'EMP003' }); // Leo Garcia
        const observer = await User.findOne({ employeeId: 'EMP004' }); // Pedro Cruz

        if (!faculty) {
            console.error('❌ Faculty Leo Garcia (EMP003) not found! Run seed.js first.');
            process.exit(1);
        }
        if (!observer) {
            console.error('❌ Observer Pedro Cruz (EMP004) not found! Run seed.js first.');
            process.exit(1);
        }

        console.log(`✅ Found Faculty: ${faculty.firstname} ${faculty.lastname} (${faculty.employeeId})`);
        console.log(`   User ID: ${faculty._id}`);
        console.log(`✅ Found Observer: ${observer.firstname} ${observer.lastname} (${observer.employeeId})`);
        console.log(`   User ID: ${observer._id}`);

        // Step 2: Create or find a schedule
        console.log('\n📅 Step 2: Creating ObserverSchedule...');
        
        // Delete any existing test schedules
        await ObserverSchedule.deleteMany({ 
            faculty_user_id: faculty._id,
            subject: 'ITE 260 Computer Programming 1'
        });

        const schedule = await ObserverSchedule.create({
            faculty_user_id: faculty._id,
            faculty_name: `${faculty.firstname} ${faculty.lastname}`,
            faculty_employee_id: faculty.employeeId,
            faculty_department: faculty.department,
            faculty_subject_name: 'ITE 260 Computer Programming 1',
            observer_id: observer._id,
            observer_name: `${observer.firstname} ${observer.lastname}`,
            observer_employee_id: observer.employeeId,
            observation_date: new Date('2025-10-22'),
            start_time: '09:00',
            end_time: '10:00',
            subject: 'ITE 260 Computer Programming 1',
            subject_type: 'Lecture',
            modality: 'Face-to-Face',
            room: 'Room 103',
            semester: '1st Semester',
            year_level: '1st Year',
            copus_type: 'Copus 1',  // Now matches both ObserverSchedule and CopusResult enum
            status: 'scheduled'
        });

        console.log(`✅ Created Schedule ID: ${schedule._id}`);
        console.log(`   Faculty: ${schedule.faculty_name}`);
        console.log(`   Faculty User ID: ${schedule.faculty_user_id}`);
        console.log(`   Observer: ${schedule.observer_name}`);

        // Step 3: Create COPUS Observation
        console.log('\n🔬 Step 3: Creating CopusObservation...');
        
        // Delete any existing observation for this schedule
        await CopusObservation.deleteMany({ scheduleId: schedule._id });

        const copusObservation = await CopusObservation.create({
            scheduleId: schedule._id,
            observerId: observer._id,
            copusNumber: 1,
            observations: [] // Will be filled with interval data
        });

        console.log(`✅ Created CopusObservation ID: ${copusObservation._id}`);

        // Step 4: Simulate interval data (45 intervals)
        console.log('\n📊 Step 4: Creating observation interval data...');
        
        const intervalData = [];
        for (let i = 1; i <= 45; i++) {
            intervalData.push({
                intervalNumber: i,
                studentActions: {
                    L: i % 3 === 0 ? 1 : 0,      // Listening every 3rd interval
                    Ind: i % 5 === 0 ? 1 : 0,    // Individual work every 5th
                    Grp: i % 7 === 0 ? 1 : 0,    // Group work every 7th
                    AnQ: i % 4 === 0 ? 1 : 0,    // Answering questions every 4th
                    AsQ: 0,
                    WC: 0,
                    SP: 0,
                    TQ: 0,
                    W: 0,
                    O: 0
                },
                teacherActions: {
                    Lec: i % 2 === 0 ? 1 : 0,    // Lecturing every 2nd interval
                    RtW: i % 6 === 0 ? 1 : 0,    // Real-time writing every 6th
                    MG: i % 4 === 0 ? 1 : 0,     // Moving and guiding every 4th
                    AnQ: 0,
                    PQ: i % 5 === 0 ? 1 : 0,     // Posing questions every 5th
                    FUp: 0,
                    '1o1': 0,
                    DV: 0,
                    Adm: 0,
                    W: 0,
                    O: 0
                },
                engagementLevel: {
                    High: i % 2 === 0 ? 1 : 0,   // High engagement every 2nd
                    Med: i % 3 === 0 ? 1 : 0,    // Med engagement every 3rd
                    Low: i % 5 === 0 ? 1 : 0     // Low engagement every 5th
                },
                comment: i % 10 === 0 ? `Interval ${i} comment` : ''
            });
        }

        console.log(`✅ Created ${intervalData.length} intervals of observation data`);

        // Step 5: Update CopusObservation with interval data
        copusObservation.observations = intervalData;
        await copusObservation.save();
        console.log('✅ Updated CopusObservation with interval data');

        // Step 6: Calculate COPUS results (mimicking the controller logic)
        console.log('\n🧮 Step 5: Calculating COPUS results...');

        const studentActionsCount = { L: 0, Ind: 0, Grp: 0, AnQ: 0, AsQ: 0, WC: 0, SP: 0, TQ: 0, W: 0, O: 0 };
        const teacherActionsCount = { Lec: 0, RtW: 0, MG: 0, AnQ: 0, PQ: 0, FUp: 0, '1o1': 0, DV: 0, Adm: 0, W: 0, O: 0 };
        const engagementCount = { High: 0, Med: 0, Low: 0 };

        intervalData.forEach(record => {
            Object.keys(record.studentActions).forEach(action => {
                if (record.studentActions[action] === 1 && studentActionsCount.hasOwnProperty(action)) {
                    studentActionsCount[action]++;
                }
            });
            Object.keys(record.teacherActions).forEach(action => {
                if (record.teacherActions[action] === 1 && teacherActionsCount.hasOwnProperty(action)) {
                    teacherActionsCount[action]++;
                }
            });
            Object.keys(record.engagementLevel).forEach(level => {
                if (record.engagementLevel[level] === 1 && engagementCount.hasOwnProperty(level)) {
                    engagementCount[level]++;
                }
            });
        });

        const totalIntervals = intervalData.length;

        // Calculate percentages with clamping
        const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

        const totalStudentActions = Object.values(studentActionsCount).reduce((sum, count) => sum + count, 0);
        const maxPossibleStudentActions = totalIntervals * 10;
        const studentActionPercentage = maxPossibleStudentActions > 0 
            ? Math.round((totalStudentActions / maxPossibleStudentActions) * 100) 
            : 0;

        const totalTeacherActions = Object.values(teacherActionsCount).reduce((sum, count) => sum + count, 0);
        const maxPossibleTeacherActions = totalIntervals * 11;
        const teacherActionPercentage = maxPossibleTeacherActions > 0 
            ? Math.round((totalTeacherActions / maxPossibleTeacherActions) * 100) 
            : 0;

        const engagementScore = (engagementCount.High * 100) + (engagementCount.Med * 50) + (engagementCount.Low * 0);
        const maxPossibleEngagementScore = totalIntervals * 100;
        const engagementLevelPercentage = maxPossibleEngagementScore > 0 
            ? Math.round((engagementScore / maxPossibleEngagementScore)) 
            : 0;

        const calculatedOverallPercentage = Math.round(
            (studentActionPercentage + teacherActionPercentage + engagementLevelPercentage) / 3
        );

        // Legacy calculations
        const student_engagement = {
            asking_questions: clamp(Math.round((studentActionsCount.AnQ / totalIntervals) * 100)),
            participating_discussions: clamp(Math.round((studentActionsCount.AsQ / totalIntervals) * 100)),
            collaborative_work: clamp(Math.round((studentActionsCount.Grp / totalIntervals) * 100)),
            problem_solving: clamp(Math.round((studentActionsCount.SP / totalIntervals) * 100))
        };

        const teacher_facilitation = {
            interactive_teaching: clamp(Math.round(((teacherActionsCount.MG + teacherActionsCount['1o1']) / totalIntervals) * 100)),
            encouraging_participation: clamp(Math.round((teacherActionsCount.PQ / totalIntervals) * 100)),
            providing_feedback: clamp(Math.round((teacherActionsCount.FUp / totalIntervals) * 100)),
            guiding_discussions: clamp(Math.round((teacherActionsCount.AnQ / totalIntervals) * 100))
        };

        const learning_environment = {
            classroom_setup: clamp(Math.round((studentActionsCount.Grp / totalIntervals) * 100)),
            technology_use: clamp(Math.round((teacherActionsCount.DV / totalIntervals) * 100)),
            resource_utilization: clamp(Math.round(((studentActionsCount.WC + teacherActionsCount.RtW) / totalIntervals) * 100)),
            time_management: clamp(Math.round(((totalIntervals - studentActionsCount.W - teacherActionsCount.W) / totalIntervals) * 100))
        };

        const studentEngAvg = (student_engagement.asking_questions + student_engagement.participating_discussions + 
                              student_engagement.collaborative_work + student_engagement.problem_solving) / 4;
        const teacherFacAvg = (teacher_facilitation.interactive_teaching + teacher_facilitation.encouraging_participation + 
                              teacher_facilitation.providing_feedback + teacher_facilitation.guiding_discussions) / 4;
        const learningEnvAvg = (learning_environment.classroom_setup + learning_environment.technology_use + 
                               learning_environment.resource_utilization + learning_environment.time_management) / 4;
        const overallPercentage = clamp(Math.round((studentEngAvg + teacherFacAvg + learningEnvAvg) / 3));

        console.log('📊 Calculated Percentages:');
        console.log(`   Student Action %: ${studentActionPercentage}%`);
        console.log(`   Teacher Action %: ${teacherActionPercentage}%`);
        console.log(`   Engagement Level %: ${engagementLevelPercentage}%`);
        console.log(`   Overall %: ${calculatedOverallPercentage}%`);

        // Step 7: Create CopusResult record
        console.log('\n💾 Step 6: Creating CopusResult...');

        // Delete any existing result for this schedule
        await CopusResult.deleteMany({ schedule_id: schedule._id });

        const copusResult = await CopusResult.create({
            schedule_id: schedule._id,
            faculty_id: faculty._id,  // ⭐ THIS IS THE CRITICAL FIELD
            faculty_name: `${faculty.firstname} ${faculty.lastname}`,
            faculty_department: faculty.department,
            observer_id: observer._id,
            observer_name: `${observer.firstname} ${observer.lastname}`,
            observation_date: schedule.observation_date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            subject_name: schedule.subject,
            room: schedule.room,
            year: schedule.year_level,
            semester: schedule.semester,
            copus_type: 'Copus 1',
            student_actions_count: studentActionsCount,
            teacher_actions_count: teacherActionsCount,
            engagement_level_count: engagementCount,
            student_action_percentage: studentActionPercentage,
            teacher_action_percentage: teacherActionPercentage,
            engagement_level_percentage: engagementLevelPercentage,
            calculated_overall_percentage: calculatedOverallPercentage,
            student_engagement: student_engagement,
            teacher_facilitation: teacher_facilitation,
            learning_environment: learning_environment,
            overall_percentage: overallPercentage,
            status: 'submitted',
            submitted_at: new Date()
        });

        console.log('✅ CopusResult created successfully!');
        console.log(`   CopusResult ID: ${copusResult._id}`);
        console.log(`   Faculty ID (saved): ${copusResult.faculty_id}`);
        console.log(`   Faculty Name: ${copusResult.faculty_name}`);
        console.log(`   Status: ${copusResult.status}`);
        console.log(`   Final Rating: ${copusResult.final_rating}`);

        // Step 8: Update schedule status
        schedule.status = 'completed';
        await schedule.save();
        console.log('✅ Schedule status updated to "completed"');

        // Step 9: Verify faculty can see their results
        console.log('\n🔍 Step 7: Testing Faculty Query (Leo Garcia view)...');
        console.log(`   Searching for faculty_id: ${faculty._id}`);

        const facultyResults = await CopusResult.find({
            faculty_id: faculty._id
        }).sort({ evaluation_date: -1 }).lean();

        console.log(`\n🎯 RESULTS FOR LEO GARCIA (EMP003):`);
        console.log(`   Total Results Found: ${facultyResults.length}`);
        
        if (facultyResults.length > 0) {
            console.log('\n✅ SUCCESS! Faculty can see their COPUS results:');
            facultyResults.forEach((result, index) => {
                console.log(`\n   Result ${index + 1}:`);
                console.log(`   - Faculty ID: ${result.faculty_id}`);
                console.log(`   - Faculty Name: ${result.faculty_name}`);
                console.log(`   - Observer: ${result.observer_name}`);
                console.log(`   - Subject: ${result.subject_name}`);
                console.log(`   - Date: ${new Date(result.observation_date).toLocaleDateString()}`);
                console.log(`   - Student Action %: ${result.student_action_percentage}%`);
                console.log(`   - Teacher Action %: ${result.teacher_action_percentage}%`);
                console.log(`   - Engagement %: ${result.engagement_level_percentage}%`);
                console.log(`   - Overall %: ${result.calculated_overall_percentage}%`);
                console.log(`   - Final Rating: ${result.final_rating}`);
                console.log(`   - Status: ${result.status}`);
            });
        } else {
            console.log('\n❌ FAILED! No results found for faculty.');
            console.log('   This means there is a faculty_id mismatch!');
        }

        // Step 10: Verify database state
        console.log('\n📋 Step 8: Database Verification...');
        
        const allResults = await CopusResult.find({}).lean();
        console.log(`   Total CopusResults in DB: ${allResults.length}`);
        
        if (allResults.length > 0) {
            console.log('\n   All CopusResults in database:');
            allResults.forEach((result, index) => {
                console.log(`   ${index + 1}. Faculty: ${result.faculty_name}, Faculty ID: ${result.faculty_id}, Date: ${new Date(result.observation_date).toLocaleDateString()}`);
            });
        }

        console.log('\n✅ TEST COMPLETE!');
        console.log('\nNow log in as Leo Garcia (EMP003) and check the COPUS History page.');
        console.log('You should see the submitted COPUS result with all percentages displayed.');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
testCopusSubmission();
