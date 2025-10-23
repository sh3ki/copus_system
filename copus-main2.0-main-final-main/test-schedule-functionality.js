// test-schedule-functionality.js
// Comprehensive test script for Admin Schedule Management System

const mongoose = require('mongoose');
const User = require('./model/employee');
const Schedule = require('./model/schedule');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/copus';

// Test utilities
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, colors.green);
}

function logError(message) {
    log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
    log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message) {
    log(`⚠ ${message}`, colors.yellow);
}

function logSection(message) {
    log(`\n${'='.repeat(60)}`, colors.bright);
    log(message, colors.bright);
    log('='.repeat(60), colors.bright);
}

// Test data
const testFaculty = [
    {
        employeeId: 'TEST001',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@test.com',
        password: '$2a$10$ZFi1JnHB.YKJKkqPK9mTUeQx5E.b7XvFjvZf3yKj7xQEQXqY0L1V6', // 'TEST001'
        role: 'Faculty',
        department: 'CIT Department',
        status: 'Active'
    },
    {
        employeeId: 'TEST002',
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane.smith@test.com',
        password: '$2a$10$ZFi1JnHB.YKJKkqPK9mTUeQx5E.b7XvFjvZf3yKj7xQEQXqY0L1V6', // 'TEST002'
        role: 'Faculty',
        department: 'CIT Department',
        status: 'Active'
    },
    {
        employeeId: 'TEST003',
        firstname: 'Bob',
        lastname: 'Johnson',
        email: 'bob.johnson@test.com',
        password: '$2a$10$ZFi1JnHB.YKJKkqPK9mTUeQx5E.b7XvFjvZf3yKj7xQEQXqY0L1V6', // 'TEST003'
        role: 'Faculty',
        department: 'CIT Department',
        status: 'Active'
    }
];

// Test functions
async function setupTestData() {
    logSection('SETTING UP TEST DATA');
    
    try {
        // Clear existing test data
        await User.deleteMany({ employeeId: { $in: ['TEST001', 'TEST002', 'TEST003'] } });
        await Schedule.deleteMany({ faculty_employee_id: { $in: ['TEST001', 'TEST002', 'TEST003'] } });
        
        logInfo('Cleared existing test data');
        
        // Insert test faculty
        const insertedUsers = await User.insertMany(testFaculty);
        logSuccess(`Created ${insertedUsers.length} test faculty members`);
        
        return insertedUsers;
    } catch (error) {
        logError(`Error setting up test data: ${error.message}`);
        throw error;
    }
}

async function testFetchFacultyList() {
    logSection('TEST 1: Fetch Faculty List');
    
    try {
        const employees = await User.find({ role: { $ne: 'admin' } }).sort({ lastname: 1 });
        
        if (employees.length > 0) {
            logSuccess(`Successfully fetched ${employees.length} employees`);
            logInfo(`Sample faculty: ${employees[0].firstname} ${employees[0].lastname} (${employees[0].employeeId})`);
            return true;
        } else {
            logError('No employees found');
            return false;
        }
    } catch (error) {
        logError(`Error fetching faculty list: ${error.message}`);
        return false;
    }
}

async function testCreateScheduleForSelectedFaculty(facultyIds) {
    logSection('TEST 2: Create Schedule for Selected Faculty');
    
    try {
        const scheduleData = {
            faculty_ids: facultyIds.slice(0, 2), // Select first 2 faculty
            target_role: 'Faculty',
            start_time: '08:00',
            end_time: '10:00',
            department: 'CIT Department',
            subject: 'ITE 260 Computer Programming 1',
            subject_type: 'Lecture',
            academic_year: '2025-2026',
            semester: '1st Semester',
            room: 'Room 101',
            days: ['Monday', 'Wednesday', 'Friday']
        };
        
        logInfo(`Creating schedules for ${scheduleData.faculty_ids.length} faculty members`);
        logInfo(`Days: ${scheduleData.days.join(', ')}`);
        logInfo(`Time: ${scheduleData.start_time} - ${scheduleData.end_time}`);
        
        // Simulate the controller logic
        const users = await User.find({ 
            employeeId: { $in: scheduleData.faculty_ids }, 
            status: 'Active' 
        });
        
        let createdCount = 0;
        for (const user of users) {
            for (const day of scheduleData.days) {
                const today = new Date();
                const newSchedule = new Schedule({
                    date: today,
                    day_of_week: day,
                    start_time: scheduleData.start_time,
                    end_time: scheduleData.end_time,
                    faculty_user_id: user._id,
                    faculty_employee_id: user.employeeId,
                    faculty_firstname: user.firstname,
                    faculty_lastname: user.lastname,
                    faculty_department: scheduleData.department,
                    faculty_subject_code: scheduleData.subject,
                    faculty_subject_name: scheduleData.subject,
                    faculty_room: scheduleData.room,
                    copus_type: 'Copus 1',
                    schedule_type: 'bulk_faculty',
                    status: 'pending',
                    school_year: scheduleData.academic_year,
                    semester: scheduleData.semester,
                    subject_type: scheduleData.subject_type
                });
                
                await newSchedule.save();
                createdCount++;
            }
        }
        
        logSuccess(`Successfully created ${createdCount} schedules`);
        logInfo(`Expected: ${users.length} faculty × ${scheduleData.days.length} days = ${users.length * scheduleData.days.length} schedules`);
        
        return createdCount === (users.length * scheduleData.days.length);
    } catch (error) {
        logError(`Error creating schedules: ${error.message}`);
        return false;
    }
}

async function testConflictDetection(facultyId) {
    logSection('TEST 3: Conflict Detection');
    
    try {
        logInfo('Creating overlapping schedule to test conflict detection...');
        
        const user = await User.findOne({ employeeId: facultyId });
        
        if (!user) {
            logError('Test faculty not found');
            return false;
        }
        
        // Try to create a conflicting schedule (08:00-10:00 already exists, trying 09:00-11:00)
        const existingSchedules = await Schedule.find({
            faculty_user_id: user._id,
            day_of_week: 'Monday',
            status: { $ne: 'cancelled' }
        });
        
        if (existingSchedules.length === 0) {
            logWarning('No existing schedules found for conflict test');
            return false;
        }
        
        logInfo(`Found ${existingSchedules.length} existing schedule(s) on Monday`);
        logInfo(`Existing time: ${existingSchedules[0].start_time} - ${existingSchedules[0].end_time}`);
        
        // Check for conflict
        const hasTimeConflict = (start1, end1, start2, end2) => {
            return (start1 < end2 && end1 > start2);
        };
        
        const newStart = '09:00';
        const newEnd = '11:00';
        
        let conflictDetected = false;
        for (const existing of existingSchedules) {
            if (hasTimeConflict(newStart, newEnd, existing.start_time, existing.end_time)) {
                conflictDetected = true;
                logSuccess(`Conflict correctly detected!`);
                logInfo(`New schedule (${newStart} - ${newEnd}) conflicts with existing (${existing.start_time} - ${existing.end_time})`);
                break;
            }
        }
        
        if (!conflictDetected) {
            logError('Conflict should have been detected but was not');
            return false;
        }
        
        // Test non-conflict
        const nonConflictStart = '14:00';
        const nonConflictEnd = '16:00';
        
        let hasNonConflict = false;
        for (const existing of existingSchedules) {
            if (hasTimeConflict(nonConflictStart, nonConflictEnd, existing.start_time, existing.end_time)) {
                hasNonConflict = true;
                break;
            }
        }
        
        if (!hasNonConflict) {
            logSuccess(`Non-overlapping time (${nonConflictStart} - ${nonConflictEnd}) correctly passed conflict check`);
        } else {
            logError('Non-overlapping time should not have conflict');
            return false;
        }
        
        return conflictDetected && !hasNonConflict;
    } catch (error) {
        logError(`Error testing conflict detection: ${error.message}`);
        return false;
    }
}

async function testFetchSchedules() {
    logSection('TEST 4: Fetch and Display Schedules');
    
    try {
        const schedules = await Schedule.find({ faculty_user_id: { $ne: null } })
            .populate('faculty_user_id', 'firstname lastname role department employeeId')
            .sort({ date: 1, start_time: 1 });
        
        if (schedules.length > 0) {
            logSuccess(`Successfully fetched ${schedules.length} schedules`);
            
            // Display sample schedules
            logInfo('\nSample schedules:');
            schedules.slice(0, 3).forEach((schedule, index) => {
                console.log(`\n  ${index + 1}. Faculty: ${schedule.faculty_firstname} ${schedule.faculty_lastname}`);
                console.log(`     Subject: ${schedule.faculty_subject_name || 'N/A'}`);
                console.log(`     Day: ${schedule.day_of_week}`);
                console.log(`     Time: ${schedule.start_time} - ${schedule.end_time}`);
                console.log(`     Room: ${schedule.faculty_room}`);
                console.log(`     Status: ${schedule.status}`);
            });
            
            return true;
        } else {
            logError('No schedules found');
            return false;
        }
    } catch (error) {
        logError(`Error fetching schedules: ${error.message}`);
        return false;
    }
}

async function testUpdateSchedule() {
    logSection('TEST 5: Update Schedule');
    
    try {
        // Find a schedule to update
        const schedule = await Schedule.findOne({ faculty_employee_id: 'TEST001' });
        
        if (!schedule) {
            logError('No schedule found to update');
            return false;
        }
        
        logInfo(`Updating schedule for ${schedule.faculty_firstname} ${schedule.faculty_lastname}`);
        logInfo(`Current time: ${schedule.start_time} - ${schedule.end_time}`);
        
        const updateData = {
            start_time: '10:00',
            end_time: '12:00',
            faculty_room: 'Room 202',
            status: 'approved'
        };
        
        const updatedSchedule = await Schedule.findByIdAndUpdate(
            schedule._id,
            { $set: updateData },
            { new: true }
        );
        
        logSuccess(`Schedule updated successfully`);
        logInfo(`New time: ${updatedSchedule.start_time} - ${updatedSchedule.end_time}`);
        logInfo(`New room: ${updatedSchedule.faculty_room}`);
        logInfo(`New status: ${updatedSchedule.status}`);
        
        return true;
    } catch (error) {
        logError(`Error updating schedule: ${error.message}`);
        return false;
    }
}

async function testDeleteSchedule() {
    logSection('TEST 6: Delete Schedule');
    
    try {
        // Find any schedule to delete (prefer TEST002 which hasn't been used yet)
        let schedule = await Schedule.findOne({ faculty_employee_id: 'TEST002' });
        
        if (!schedule) {
            // Fallback to any test schedule
            schedule = await Schedule.findOne({ faculty_employee_id: { $in: ['TEST001', 'TEST002', 'TEST003'] } });
        }
        
        if (!schedule) {
            logWarning('No test schedule found to delete - creating one for testing');
            
            const user = await User.findOne({ employeeId: 'TEST002' });
            if (!user) {
                logError('Test user not found');
                return false;
            }
            
            schedule = new Schedule({
                date: new Date(),
                day_of_week: 'Tuesday',
                start_time: '14:00',
                end_time: '16:00',
                faculty_user_id: user._id,
                faculty_employee_id: user.employeeId,
                faculty_firstname: user.firstname,
                faculty_lastname: user.lastname,
                faculty_department: 'CIT Department',
                copus_type: 'Copus 1',
                schedule_type: 'bulk_faculty',
                status: 'pending'
            });
            
            await schedule.save();
            logInfo('Created new test schedule for deletion');
        }
        
        logInfo(`Deleting schedule for ${schedule.faculty_firstname} ${schedule.faculty_lastname}`);
        logInfo(`Day: ${schedule.day_of_week}, Time: ${schedule.start_time} - ${schedule.end_time}`);
        
        await Schedule.findByIdAndDelete(schedule._id);
        
        // Verify deletion
        const deletedSchedule = await Schedule.findById(schedule._id);
        
        if (!deletedSchedule) {
            logSuccess('Schedule deleted successfully');
            return true;
        } else {
            logError('Schedule was not deleted');
            return false;
        }
    } catch (error) {
        logError(`Error deleting schedule: ${error.message}`);
        return false;
    }
}

async function testScheduleFiltering() {
    logSection('TEST 7: Schedule Filtering by Year and Semester');
    
    try {
        // Filter by year
        const year2025Schedules = await Schedule.find({ 
            school_year: '2025-2026' 
        });
        
        logSuccess(`Found ${year2025Schedules.length} schedules for academic year 2025-2026`);
        
        // Filter by semester
        const semester1Schedules = await Schedule.find({ 
            semester: '1st Semester' 
        });
        
        logSuccess(`Found ${semester1Schedules.length} schedules for 1st Semester`);
        
        // Combined filter
        const combinedSchedules = await Schedule.find({ 
            school_year: '2025-2026',
            semester: '1st Semester'
        });
        
        logSuccess(`Found ${combinedSchedules.length} schedules for 2025-2026, 1st Semester`);
        
        return true;
    } catch (error) {
        logError(`Error filtering schedules: ${error.message}`);
        return false;
    }
}

async function generateTestReport(results) {
    logSection('TEST REPORT');
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\nTest Results:');
    results.forEach((result, index) => {
        const status = result.passed ? logSuccess : logError;
        status(`${index + 1}. ${result.name}`);
    });
    
    console.log('\n');
    log(`Total Tests: ${totalTests}`, colors.bright);
    log(`Passed: ${passedTests}`, colors.green);
    log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
    log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`, 
        passedTests === totalTests ? colors.green : colors.yellow);
    
    return passedTests === totalTests;
}

async function cleanup() {
    logSection('CLEANUP');
    
    try {
        await User.deleteMany({ employeeId: { $in: ['TEST001', 'TEST002', 'TEST003'] } });
        await Schedule.deleteMany({ faculty_employee_id: { $in: ['TEST001', 'TEST002', 'TEST003'] } });
        
        logSuccess('Test data cleaned up successfully');
    } catch (error) {
        logError(`Error cleaning up: ${error.message}`);
    }
}

// Main test runner
async function runAllTests() {
    log('\n' + '='.repeat(60), colors.bright);
    log('ADMIN SCHEDULE MANAGEMENT SYSTEM - COMPREHENSIVE TEST SUITE', colors.bright);
    log('='.repeat(60) + '\n', colors.bright);
    
    try {
        // Connect to database
        await mongoose.connect(MONGODB_URI);
        logSuccess('Connected to MongoDB');
        
        // Setup test data
        const testUsers = await setupTestData();
        const testFacultyIds = testUsers.map(u => u.employeeId);
        
        // Run tests
        const results = [];
        
        results.push({
            name: 'Fetch Faculty List',
            passed: await testFetchFacultyList()
        });
        
        results.push({
            name: 'Create Schedule for Selected Faculty',
            passed: await testCreateScheduleForSelectedFaculty(testFacultyIds)
        });
        
        results.push({
            name: 'Conflict Detection',
            passed: await testConflictDetection(testFacultyIds[0])
        });
        
        results.push({
            name: 'Fetch and Display Schedules',
            passed: await testFetchSchedules()
        });
        
        results.push({
            name: 'Update Schedule',
            passed: await testUpdateSchedule()
        });
        
        results.push({
            name: 'Delete Schedule',
            passed: await testDeleteSchedule()
        });
        
        results.push({
            name: 'Schedule Filtering',
            passed: await testScheduleFiltering()
        });
        
        // Generate report
        const allTestsPassed = await generateTestReport(results);
        
        // Cleanup
        await cleanup();
        
        // Close connection
        await mongoose.connection.close();
        logSuccess('\nDatabase connection closed');
        
        if (allTestsPassed) {
            log('\n🎉 ALL TESTS PASSED! The schedule management system is fully functional.', colors.green + colors.bright);
        } else {
            log('\n⚠️  SOME TESTS FAILED! Please review the errors above.', colors.red + colors.bright);
        }
        
        process.exit(allTestsPassed ? 0 : 1);
        
    } catch (error) {
        logError(`\nFatal error: ${error.message}`);
        console.error(error);
        
        try {
            await cleanup();
            await mongoose.connection.close();
        } catch (cleanupError) {
            logError(`Error during cleanup: ${cleanupError.message}`);
        }
        
        process.exit(1);
    }
}

// Run the tests
runAllTests();
